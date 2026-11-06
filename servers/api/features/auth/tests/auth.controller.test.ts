import assert from 'node:assert/strict'
import test from 'node:test'
import type { Request, Response } from 'express'
import { createAuthController, createAuthRateLimitHandler, getSessionTokenDigest } from '../auth.controller.js'
import type { AuthIdentity, AuthService } from '../auth.types.js'

/* eslint-disable @typescript-eslint/require-await -- service fakes preserve the async contract under test. */

const identity: AuthIdentity = { id: 'user-1', name: 'Ayesha', email: 'ayesha@example.test', teamId: 'team-1', teamName: 'Studio', role: 'owner' }
const session = { identity, token: 'session-secret', expiresAt: new Date('2026-11-12T00:00:00.000Z') }
const createHarness = () => {
    const calls: Array<{ method: string; args: unknown[] }> = []
    const service = Object.fromEntries([
        ['register', async (...args: unknown[]) => { calls.push({ method: 'register', args }); return { verificationRequired: true as const } }],
        ['login', async (...args: unknown[]) => { calls.push({ method: 'login', args }); return session }],
        ['logout', async (...args: unknown[]) => { calls.push({ method: 'logout', args }) }],
        ['getSession', async (...args: unknown[]) => { calls.push({ method: 'getSession', args }); return identity }],
        ['requestEmailVerification', async (...args: unknown[]) => { calls.push({ method: 'requestEmailVerification', args }) }],
        ['verifyEmail', async (...args: unknown[]) => { calls.push({ method: 'verifyEmail', args }) }],
        ['requestPasswordReset', async (...args: unknown[]) => { calls.push({ method: 'requestPasswordReset', args }) }],
        ['resetPassword', async (...args: unknown[]) => { calls.push({ method: 'resetPassword', args }) }],
        ['inviteMember', async (...args: unknown[]) => { calls.push({ method: 'inviteMember', args }) }],
        ['acceptInvitation', async (...args: unknown[]) => { calls.push({ method: 'acceptInvitation', args }); return session }],
        ['listTeamMembers', async (...args: unknown[]) => { calls.push({ method: 'listTeamMembers', args }); return [{ id: 'member-1', name: 'Sam', email: 'sam@example.test', role: 'editor' as const }] }],
        ['updateTeamMemberRole', async (...args: unknown[]) => { calls.push({ method: 'updateTeamMemberRole', args }) }],
        ['removeTeamMember', async (...args: unknown[]) => { calls.push({ method: 'removeTeamMember', args }) }]
    ]) as unknown as AuthService
    const controller = createAuthController({ service, webOrigins: ['https://worklist.example.test'], secureCookies: false })
    const responseState: { status?: number; body?: unknown; headers: Record<string, string>; ended: boolean } = { headers: {}, ended: false }
    const response = {
        status(code: number) { responseState.status = code; return this },
        setHeader(name: string, value: string) { responseState.headers[name] = value },
        json(body: unknown) { responseState.body = body; return this },
        end() { responseState.ended = true; return this }
    } as unknown as Response
    const request = (body: unknown = {}, options: { cookie?: string; identity?: AuthIdentity; params?: Record<string, string> } = {}) => ({
        body,
        headers: { ...(options.cookie ? { cookie: options.cookie } : {}) },
        params: options.params ?? {},
        authIdentity: options.identity,
        get: (name: string) => name === 'origin' ? 'https://worklist.example.test' : undefined
    }) as unknown as Request
    return { calls, controller, response, responseState, request }
}

void test('auth controller handles account/session flows with safe cookies and no-store responses', async () => {
    const { calls, controller, response, responseState, request } = createHarness()
    await controller.routes.register(request({ name: 'Ayesha', email: identity.email, password: 'StrongPass123!', teamName: 'Studio' }), response, () => {})
    assert.equal(responseState.status, 201)
    assert.deepEqual(responseState.body, { verificationRequired: true })
    assert.equal(responseState.headers['Cache-Control'], 'no-store')

    await controller.routes.login(request({ email: identity.email, password: 'StrongPass123!' }), response, () => {})
    assert.equal(responseState.headers['Set-Cookie'], 'worklist_session=session-secret; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800')
    assert.deepEqual(responseState.body, { user: identity })
    await controller.routes.currentSession(request({}, { cookie: 'other=x; worklist_session=session-secret' }), response, () => {})
    assert.deepEqual(calls.find((call) => call.method === 'getSession')?.args, ['session-secret'])
    await controller.routes.logout(request({}, { cookie: 'worklist_session=session-secret' }), response, () => {})
    assert.equal(responseState.headers['Set-Cookie'], 'worklist_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0')
    assert.equal(responseState.ended, true)

    const unauthenticated = createAuthController({ service: { getSession: async () => null } as unknown as AuthService, webOrigins: [], secureCookies: false })
    const emptySession = createHarness()
    await unauthenticated.routes.currentSession(emptySession.request(), emptySession.response, () => {})
    assert.equal(emptySession.responseState.status, 401)
    assert.match(JSON.stringify(emptySession.responseState.body), /unauthenticated/)
})

void test('auth controller handles action links, invitations, and owner member routes', async () => {
    const { calls, controller, response, responseState, request } = createHarness()
    await controller.routes.requestVerification(request({ email: identity.email }), response, () => {})
    await controller.routes.verifyEmail(request({ token: 'v'.repeat(32) }), response, () => {})
    await controller.routes.requestPasswordReset(request({ email: identity.email }), response, () => {})
    await controller.routes.resetPassword(request({ token: 'r'.repeat(32), password: 'NewStrongPass123!' }), response, () => {})
    await controller.routes.inviteMember(request({ email: 'new@example.test', role: 'viewer' }, { identity }), response, () => {})
    await controller.routes.acceptInvitation(request({ token: 'i'.repeat(32), name: 'Sam', password: 'StrongPass123!' }), response, () => {})
    await controller.routes.listTeamMembers(request({}, { identity }), response, () => {})
    await controller.routes.updateTeamMember(request({ role: 'editor' }, { identity, params: { memberId: 'a'.repeat(24) } }), response, () => {})
    await controller.routes.removeTeamMember(request({}, { identity, params: { memberId: 'a'.repeat(24) } }), response, () => {})

    assert.deepEqual(calls.map(({ method }) => method), [
        'requestEmailVerification', 'verifyEmail', 'requestPasswordReset', 'resetPassword', 'inviteMember', 'acceptInvitation',
        'listTeamMembers', 'updateTeamMemberRole', 'removeTeamMember'
    ])
    assert.equal(responseState.status, 204)
    assert.equal(responseState.ended, true)
})

void test('origin, rate-limit, missing identity, cookie security, and session digest boundaries are explicit', async () => {
    const { controller, response, responseState, request } = createHarness()
    let originError: unknown
    controller.verifyOrigin({ get: () => 'https://evil.example' } as unknown as Request, response, (error?: unknown) => { originError = error })
    assert.equal((originError as { status?: number }).status, 403)

    createAuthRateLimitHandler()(request(), response, () => {})
    assert.equal(responseState.status, 429)
    assert.deepEqual(responseState.body, { error: { code: 'rate_limited', message: 'Too many requests. Please try again later.' } })

    await assert.rejects(async () => controller.routes.inviteMember(request({ email: 'new@example.test', role: 'editor' }), response, () => {}), /Authentication is required/)
    await assert.rejects(async () => controller.routes.listTeamMembers(request(), response, () => {}), /Authentication is required/)
    await assert.rejects(async () => controller.routes.updateTeamMember(request({ role: 'viewer' }, { params: { memberId: 'a'.repeat(24) } }), response, () => {}), /Authentication is required/)
    await assert.rejects(async () => controller.routes.removeTeamMember(request({}, { params: { memberId: 'b'.repeat(24) } }), response, () => {}), /Authentication is required/)

    const secure = createAuthController({ service: { login: async () => session } as unknown as AuthService, webOrigins: [], secureCookies: true })
    await secure.routes.login(request({ email: identity.email, password: 'StrongPass123!' }), response, () => {})
    assert.match(responseState.headers['Set-Cookie'] ?? '', /; Secure$/)
    assert.equal(getSessionTokenDigest(request()), null)
    const { getSessionTokenDigest: digestToken } = await import('../auth.controller.js')
    assert.match(digestToken(request({}, { cookie: 'worklist_session=session-secret' })) ?? '', /^[a-f0-9]{64}$/)
})
