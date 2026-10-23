import test from 'node:test'
import assert from 'node:assert/strict'
import type { Request, Response } from 'express'
import { createAuthGuard } from '../auth.controller.js'
import type { AuthIdentity, AuthService } from '../auth.types.js'

const identity: AuthIdentity = {
    id: 'user-1',
    name: 'Ayesha',
    email: 'ayesha@example.test',
    teamId: 'team-1',
    teamName: 'Design',
    role: 'viewer'
}

const makeRequest = (cookie?: string): Request =>
    ({
        headers: cookie ? { cookie } : {}
    }) as unknown as Request

void test('auth guard rejects requests without a valid session', async () => {
    const guard = createAuthGuard({ service: { getSession: () => Promise.resolve(null) } as unknown as AuthService })
    let receivedError: unknown

    await guard(makeRequest(), {} as Response, (error?: unknown) => {
        receivedError = error
    })

    assert.equal(typeof receivedError, 'object')
    assert.equal((receivedError as { status?: number }).status, 401)
})

void test('auth guard attaches the resolved identity to the request', async () => {
    const guard = createAuthGuard({
        service: { getSession: (token: string | null) => Promise.resolve(token ? identity : null) } as unknown as AuthService
    })
    const request = makeRequest('worklist_session=opaque-token') as Request & { authIdentity?: AuthIdentity }
    let receivedError: unknown

    await guard(request, {} as Response, (error?: unknown) => {
        receivedError = error
    })

    assert.equal(receivedError, undefined)
    assert.deepEqual(request.authIdentity, identity)
})
