import assert from 'node:assert/strict'
import test from 'node:test'
import { createAuthService } from '../auth.service.js'
import { hashPassword } from '../auth.credentials.js'
import type { AuthIdentity, AuthRepository } from '../auth.types.js'

/* eslint-disable @typescript-eslint/require-await -- repository and mailer fakes model asynchronous boundaries. */

const owner: AuthIdentity = { id: 'owner-1', name: 'Owner', email: 'owner@example.test', teamId: 'team-1', teamName: 'Studio', role: 'owner' }
const verifiedUser = { ...owner, emailVerified: true, passwordHash: '' }
const makeHarness = (overrides: Partial<AuthRepository> = {}, options: { available?: boolean; email?: boolean } = {}) => {
    const calls: string[] = []
    const sent: Array<{ to: string; subject: string; text: string; html: string }> = []
    const repository: AuthRepository = {
        createAccount: async () => { calls.push('createAccount'); return owner },
        findUserByEmail: async () => null,
        createSession: async () => { calls.push('createSession') },
        findSessionIdentity: async () => owner,
        deleteSession: async () => { calls.push('deleteSession') },
        createActionToken: async (input) => { calls.push(`token:${input.kind}:${input.email}`) },
        consumeActionToken: async () => 'owner@example.test',
        markEmailVerified: async () => true,
        updatePassword: async () => true,
        acceptInvitation: async () => owner,
        listTeamMembers: async () => [],
        updateTeamMemberRole: async () => true,
        removeTeamMember: async () => true,
        ...overrides
    }
    const service = createAuthService({
        repository,
        isPersistenceAvailable: () => options.available ?? true,
        ...(options.email === false ? {} : { emailSender: { send: async (message) => { sent.push(message) } } }),
        webOrigin: 'https://worklist.example.test',
        now: () => new Date('2026-11-05T00:00:00.000Z')
    })
    return { service, calls, sent }
}

const hasStatus = (status: number) => (error: unknown): boolean => typeof error === 'object' && error !== null && 'status' in error && error.status === status

void test('registration creates an account and sends a verification link; rejects unavailable, unconfigured, existing, and raced accounts', async () => {
    const request = { name: 'Owner', email: owner.email, password: 'StrongPass123!', teamName: 'Studio' }
    const successful = makeHarness()
    assert.deepEqual(await successful.service.register(request), { verificationRequired: true })
    assert.deepEqual(successful.calls, ['createAccount', `token:email-verification:${owner.email}`])
    assert.match(successful.sent[0]?.text ?? '', /https:\/\/worklist\.example\.test\/verify-email\?token=/)
    assert.match(successful.sent[0]?.html ?? '', /Verify email/)

    await assert.rejects(makeHarness({}, { available: false }).service.register(request), hasStatus(503))
    await assert.rejects(makeHarness({}, { email: false }).service.register(request), hasStatus(503))
    await assert.rejects(makeHarness({ findUserByEmail: async () => verifiedUser }).service.register(request), hasStatus(409))
    await assert.rejects(makeHarness({ createAccount: async () => { throw Object.assign(new Error('duplicate key'), { code: 11000 }) } }).service.register(request), hasStatus(409))
    await assert.rejects(makeHarness({ createAccount: async () => { throw new Error('database write failed') } }).service.register(request), /database write failed/)
})

void test('login, sessions, and logout handle invalid credentials, unverified accounts, missing tokens, and success', async () => {
    const wrongPassword = makeHarness({ findUserByEmail: async () => ({ ...verifiedUser, passwordHash: 'invalid' }) })
    await assert.rejects(wrongPassword.service.login({ email: owner.email, password: 'wrong' }), hasStatus(401))
    await assert.rejects(makeHarness().service.login({ email: owner.email, password: 'anything' }), hasStatus(401))

    const passwordHash = await hashPassword('StrongPass123!')
    const unverified = makeHarness({ findUserByEmail: async () => ({ ...verifiedUser, emailVerified: false, passwordHash }) })
    await assert.rejects(unverified.service.login({ email: owner.email, password: 'StrongPass123!' }), hasStatus(403))
    await assert.rejects(makeHarness({}, { available: false }).service.login({ email: owner.email, password: 'anything' }), hasStatus(503))

    const authenticated = makeHarness({ findUserByEmail: async () => ({ ...verifiedUser, passwordHash }) })
    const session = await authenticated.service.login({ email: owner.email, password: 'StrongPass123!' })
    assert.equal(session.identity.id, owner.id)
    assert.equal(session.expiresAt.toISOString(), '2026-11-12T00:00:00.000Z')
    assert.deepEqual(await authenticated.service.getSession(null), null)
    assert.deepEqual(await authenticated.service.getSession(session.token), owner)
    await authenticated.service.logout(null)
    await authenticated.service.logout(session.token)
    assert.deepEqual(authenticated.calls, ['createSession', 'deleteSession'])
})

void test('password reset and email verification issue links only for eligible accounts and reject invalid action tokens', async () => {
    const harness = makeHarness({ findUserByEmail: async () => verifiedUser })
    await harness.service.requestPasswordReset(owner.email)
    assert.equal(harness.sent.length, 1)
    assert.match(harness.sent[0]?.text ?? '', /reset-password/)
    await harness.service.requestEmailVerification(owner.email)
    assert.equal(harness.sent.length, 1)

    const unverified = makeHarness({ findUserByEmail: async () => ({ ...verifiedUser, emailVerified: false }) })
    await unverified.service.requestPasswordReset(owner.email)
    await unverified.service.requestEmailVerification(owner.email)
    assert.equal(unverified.sent.length, 1)
    assert.match(unverified.sent[0]?.text ?? '', /verify-email/)

    const missing = makeHarness({ findUserByEmail: async () => null })
    await missing.service.requestPasswordReset('unknown@example.test')
    await missing.service.requestEmailVerification('unknown@example.test')
    assert.equal(missing.sent.length, 0)

    const actions = makeHarness({ findUserByEmail: async () => verifiedUser })
    await actions.service.requestPasswordReset(owner.email)
    assert.match(actions.sent[0]?.text ?? '', /reset-password/)
    await actions.service.resetPassword('reset-token', 'NewStrongPass123!')
    await actions.service.verifyEmail('verify-token')
    await assert.rejects(makeHarness({ consumeActionToken: async () => null }).service.resetPassword('bad-token', 'NewStrongPass123!'), hasStatus(400))
    await assert.rejects(makeHarness({ markEmailVerified: async () => false }).service.verifyEmail('used-token'), hasStatus(400))
    await assert.rejects(makeHarness({}, { available: false }).service.requestPasswordReset(owner.email), hasStatus(503))
    await assert.rejects(makeHarness({}, { email: false }).service.requestEmailVerification(owner.email), hasStatus(503))
})

void test('invitation acceptance, duplicate detection, and owner-only team changes return safe outcomes', async () => {
    const invited = makeHarness()
    await invited.service.inviteMember(owner, 'new@example.test', 'viewer', 'Review launch')
    assert.match(invited.sent[0]?.text ?? '', /accept-invitation/)
    assert.match(invited.sent[0]?.text ?? '', /Review launch/)
    const accepted = await invited.service.acceptInvitation({ token: 'invite-token', name: 'New member', password: 'StrongPass123!' })
    assert.equal(accepted.identity.id, owner.id)
    assert.deepEqual(invited.calls, ['token:team-invitation:new@example.test', 'createSession'])

    await assert.rejects(makeHarness({ acceptInvitation: async () => null }).service.acceptInvitation({ token: 'expired', name: 'N', password: 'StrongPass123!' }), hasStatus(400))
    await assert.rejects(makeHarness({ findUserByEmail: async () => verifiedUser }).service.inviteMember(owner, owner.email, 'editor'), hasStatus(409))
    await assert.rejects(makeHarness({ findUserByEmail: async () => ({ ...verifiedUser, teamId: 'other-team' }) }).service.inviteMember(owner, owner.email, 'editor'), hasStatus(409))
    await assert.rejects(makeHarness().service.inviteMember({ ...owner, role: 'editor' }, 'new@example.test', 'editor'), hasStatus(403))
    await assert.rejects(makeHarness({ updateTeamMemberRole: async () => false }).service.updateTeamMemberRole(owner, 'missing', 'viewer'), hasStatus(404))
    await assert.rejects(makeHarness({ removeTeamMember: async () => false }).service.removeTeamMember(owner, 'missing'), hasStatus(404))
    await assert.rejects(makeHarness({}, { available: false }).service.listTeamMembers(owner), hasStatus(503))
})
