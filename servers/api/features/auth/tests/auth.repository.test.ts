import assert from 'node:assert/strict'
import test from 'node:test'
import { Types } from '../../../integrations/index.js'
import { AuthActionTokenModel, AuthSessionModel, AuthTeamModel, AuthUserModel } from '../auth.model.js'
import { createAuthRepository } from '../auth.repository.js'

/* eslint-disable @typescript-eslint/require-await -- persistence fakes retain the promise-based repository contract. */

const userId = new Types.ObjectId('6ad88dc926697648475ad00e')
const teamId = new Types.ObjectId('6ad88dc926697648475ad011')
const memberId = new Types.ObjectId('6ad88dc926697648475ad022')
const user = { _id: userId, name: 'Ayesha', email: 'ayesha@example.test', teamId, emailVerifiedAt: new Date(), passwordHash: 'hash' }
const team = { _id: teamId, name: 'Studio', ownerId: userId, members: [{ userId, role: 'owner' as const }, { userId: memberId, role: 'editor' as const }] }
const query = (value: unknown) => { const chain = { select: () => chain, lean: () => chain, exec: async () => value }; return chain }
const stub = (target: object, key: string, value: unknown): (() => void) => {
    const original = Object.getOwnPropertyDescriptor(target, key)
    Object.defineProperty(target, key, { configurable: true, writable: true, value })
    return () => original ? Object.defineProperty(target, key, original) : Reflect.deleteProperty(target, key)
}
const withStubs = async (stubs: Array<() => void>, run: () => Promise<void>) => { try { await run() } finally { stubs.reverse().forEach((restore) => { restore(); }) } }

void test('account creation commits the owner membership and rolls back both records when team creation fails', async () => {
    const calls: string[] = []
    const stubs = [
        stub(AuthUserModel, 'create', async () => { calls.push('user:create'); return user }),
        stub(AuthTeamModel, 'create', async () => { calls.push('team:create'); return team }),
        stub(AuthUserModel, 'updateOne', () => { calls.push('user:link'); return query({ modifiedCount: 1 }) }),
        stub(AuthTeamModel, 'deleteOne', () => { calls.push('team:rollback'); return query({ deletedCount: 1 }) }),
        stub(AuthUserModel, 'deleteOne', () => { calls.push('user:rollback'); return query({ deletedCount: 1 }) })
    ]
    await withStubs(stubs, async () => {
        const result = await createAuthRepository().createAccount({ name: user.name, email: user.email, passwordHash: 'hash', teamName: team.name })
        assert.deepEqual(result, { id: userId.toString(), name: user.name, email: user.email, teamId: teamId.toString(), teamName: team.name, role: 'owner' })
        assert.deepEqual(calls, ['user:create', 'team:create', 'user:link'])
        const failTeam = stub(AuthTeamModel, 'create', async () => { throw new Error('team storage unavailable') })
        await assert.rejects(createAuthRepository().createAccount({ name: user.name, email: user.email, passwordHash: 'hash', teamName: team.name }), /team storage unavailable/)
        failTeam()
        assert.deepEqual(calls.slice(-2), ['team:rollback', 'user:rollback'])
    })
})

void test('user and session lookup require a team, verified email, and active membership', async () => {
    let userResult: unknown = user
    let teamResult: unknown = team
    let sessionResult: unknown = { userId, tokenDigest: 'digest' }
    const stubs = [
        stub(AuthUserModel, 'findOne', () => query(userResult)),
        stub(AuthUserModel, 'findById', () => query(userResult)),
        stub(AuthTeamModel, 'findById', () => query(teamResult)),
        stub(AuthSessionModel, 'findOne', () => query(sessionResult))
    ]
    await withStubs(stubs, async () => {
        const repository = createAuthRepository()
        assert.deepEqual(await repository.findUserByEmail(user.email), { id: userId.toString(), name: user.name, email: user.email, teamId: teamId.toString(), teamName: team.name, role: 'owner', emailVerified: true, passwordHash: 'hash' })
        assert.equal((await repository.findSessionIdentity('digest', new Date()))?.id, userId.toString())

        userResult = { ...user, emailVerifiedAt: null }
        assert.equal(await repository.findSessionIdentity('digest', new Date()), null)
        userResult = { ...user, teamId: undefined }
        assert.equal(await repository.findUserByEmail(user.email), null)
        assert.equal(await repository.findSessionIdentity('digest', new Date()), null)
        userResult = user
        teamResult = null
        assert.equal(await repository.findUserByEmail(user.email), null)
        assert.equal(await repository.findSessionIdentity('digest', new Date()), null)
        teamResult = { ...team, ownerId: memberId, members: [{ userId: memberId, role: 'editor' as const }] }
        assert.equal(await repository.findUserByEmail(user.email), null)
        assert.equal(await repository.findSessionIdentity('digest', new Date()), null)
        teamResult = { ...team, members: undefined }
        assert.equal((await repository.findUserByEmail(user.email))?.role, 'owner')
        sessionResult = null
        assert.equal(await repository.findSessionIdentity('digest', new Date()), null)
    })
})

void test('session, action-token, verification, password, and team member mutations stay scoped', async () => {
    let tokenResult: unknown = { email: user.email }
    let passwordUser: unknown = { _id: userId }
    let teamResult: unknown = team
    let modifiedCount = 1
    const calls: string[] = []
    const stubs = [
        stub(AuthSessionModel, 'create', async () => { calls.push('session:create') }),
        stub(AuthSessionModel, 'deleteOne', () => { calls.push('session:delete'); return query({ deletedCount: 1 }) }),
        stub(AuthSessionModel, 'deleteMany', () => { calls.push('session:deleteMany'); return query({ deletedCount: 1 }) }),
        stub(AuthActionTokenModel, 'create', async () => { calls.push('token:create') }),
        stub(AuthActionTokenModel, 'findOneAndDelete', () => query(tokenResult)),
        stub(AuthUserModel, 'updateOne', () => { calls.push('user:update'); return query({ modifiedCount }) }),
        stub(AuthUserModel, 'findOneAndUpdate', () => query(passwordUser)),
        stub(AuthTeamModel, 'findById', () => query(teamResult)),
        stub(AuthTeamModel, 'findOneAndUpdate', () => query(teamResult)),
        stub(AuthTeamModel, 'updateOne', () => { calls.push('team:update'); return query({ modifiedCount }) }),
        stub(AuthTeamModel, 'findById', () => query(teamResult)),
        stub(AuthUserModel, 'find', () => query([user, { ...user, _id: memberId, name: 'Sam', email: 'sam@example.test' }]))
    ]
    await withStubs(stubs, async () => {
        const repository = createAuthRepository()
        await repository.createSession({ userId: userId.toString(), tokenDigest: 'digest', expiresAt: new Date() })
        await repository.deleteSession('digest')
        await repository.createActionToken({ tokenDigest: 'token-digest', kind: 'team-invitation', email: 'sam@example.test', expiresAt: new Date(), teamId: teamId.toString(), role: 'editor' })
        assert.equal(await repository.consumeActionToken('token-digest', 'email-verification', new Date()), user.email)
        tokenResult = null
        assert.equal(await repository.consumeActionToken('bad', 'password-reset', new Date()), null)
        assert.equal(await repository.markEmailVerified(user.email), true)
        modifiedCount = 0
        assert.equal(await repository.markEmailVerified(user.email), false)
        passwordUser = null
        assert.equal(await repository.updatePassword(user.email, 'new-hash'), false)
        passwordUser = { _id: userId }
        assert.equal(await repository.updatePassword(user.email, 'new-hash'), true)
        assert.deepEqual(await repository.listTeamMembers(teamId.toString()), [
            { id: userId.toString(), name: user.name, email: user.email, role: 'owner' },
            { id: memberId.toString(), name: 'Sam', email: 'sam@example.test', role: 'editor' }
        ])
        assert.equal(await repository.updateTeamMemberRole(teamId.toString(), memberId.toString(), 'viewer'), false)
        modifiedCount = 1
        assert.equal(await repository.updateTeamMemberRole(teamId.toString(), memberId.toString(), 'viewer'), true)
        modifiedCount = 0
        assert.equal(await repository.removeTeamMember(teamId.toString(), memberId.toString()), false)
        modifiedCount = 1
        assert.equal(await repository.removeTeamMember(teamId.toString(), memberId.toString()), true)
        teamResult = null
        assert.deepEqual(await repository.listTeamMembers(teamId.toString()), [])
        assert.ok(calls.includes('session:deleteMany'))
    })
})

void test('invitation acceptance handles invalid invites, existing unlinked users, new users, and rollback', async () => {
    let invitation: unknown = { email: 'new@example.test', teamId, role: 'viewer' }
    let teamResult: unknown = team
    let existing: unknown = null
    let userAfter: unknown = user
    let memberModified = 1
    const calls: string[] = []
    const stubs = [
        stub(AuthActionTokenModel, 'findOneAndDelete', () => query(invitation)),
        stub(AuthTeamModel, 'findById', () => query(teamResult)),
        stub(AuthUserModel, 'findOne', () => query(existing)),
        stub(AuthUserModel, 'create', async (input: unknown) => { calls.push('create-user'); return { _id: (input as { _id: Types.ObjectId })._id } }),
        stub(AuthUserModel, 'updateOne', () => { calls.push('link-user'); return query({ modifiedCount: 1 }) }),
        stub(AuthTeamModel, 'updateOne', () => query({ modifiedCount: memberModified })),
        stub(AuthUserModel, 'findById', () => query(userAfter)),
        stub(AuthUserModel, 'deleteOne', () => { calls.push('rollback-user'); return query({ deletedCount: 1 }) })
    ]
    await withStubs(stubs, async () => {
        const repository = createAuthRepository()
        assert.equal(await repository.acceptInvitation({ tokenDigest: 'x', name: 'Sam', passwordHash: 'hash', now: new Date() }) !== null, true)
        invitation = { email: 'new@example.test' }
        assert.equal(await repository.acceptInvitation({ tokenDigest: 'x', name: 'Sam', passwordHash: 'hash', now: new Date() }), null)
        invitation = { email: 'new@example.test', teamId, role: 'viewer' }
        existing = { _id: memberId }
        userAfter = { ...user, _id: memberId, name: 'Sam', email: 'new@example.test' }
        assert.equal((await repository.acceptInvitation({ tokenDigest: 'x', name: 'Sam', passwordHash: 'hash', now: new Date() }))?.id, memberId.toString())
        existing = { _id: memberId, teamId }
        assert.equal(await repository.acceptInvitation({ tokenDigest: 'x', name: 'Sam', passwordHash: 'hash', now: new Date() }), null)
        existing = null
        memberModified = 0
        await assert.rejects(repository.acceptInvitation({ tokenDigest: 'x', name: 'Sam', passwordHash: 'hash', now: new Date() }), /team is no longer available/)
        assert.ok(calls.includes('rollback-user'))
        teamResult = null
        assert.equal(await repository.acceptInvitation({ tokenDigest: 'x', name: 'Sam', passwordHash: 'hash', now: new Date() }), null)
        invitation = null
        assert.equal(await repository.acceptInvitation({ tokenDigest: 'x', name: 'Sam', passwordHash: 'hash', now: new Date() }), null)
    })
})
