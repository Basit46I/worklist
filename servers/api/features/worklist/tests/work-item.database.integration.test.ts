import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, test } from 'node:test'
import { createLogger } from '@workspace/logging'
import { createApp, createServer } from '../../../bootstrap/index.js'
import type { ApiServer } from '../../../bootstrap/create-server.js'
import { createMongoDbIntegration } from '../../../integrations/index.js'
import { AuthActionTokenModel, AuthSessionModel, AuthTeamModel, AuthUserModel } from '../../auth/public.js'
import { createSessionToken, digestSessionToken, hashPassword } from '../../auth/public.js'
import { createAuthRepository } from '../../auth/public.js'
import { WorkItemCommentModel } from '../work-item-comment.model.js'
import { WorkItemModel } from '../work-item.model.js'
import { SavedViewModel } from '../saved-view.model.js'

const providedUri = process.env.WORKLIST_TEST_MONGODB_URI
const skipReason = providedUri ? false : 'Set WORKLIST_TEST_MONGODB_URI to run MongoDB-backed API tests.'
const logger = createLogger({ service: 'worklist-api-integration-test', level: 'error', format: 'json' })
const runId = randomUUID()
const config = {
    environment: 'test' as const,
    host: '127.0.0.1',
    port: 0,
    webOrigin: 'http://localhost:3000',
    logLevel: 'silent' as const
}

const isolatedUri = (): string => {
    if (!providedUri) throw new Error('WORKLIST_TEST_MONGODB_URI is required.')
    const uri = new URL(providedUri)
    const configuredDatabaseName = decodeURIComponent(uri.pathname.replace(/^\//, ''))
    if (!/(^|[-_])test($|[-_])/i.test(configuredDatabaseName)) {
        throw new Error("WORKLIST_TEST_MONGODB_URI must point to a database whose name contains 'test'.")
    }
    return uri.toString()
}

let database: ReturnType<typeof createMongoDbIntegration> | undefined
let databaseConnected = false
let server: ApiServer | undefined
let baseUrl: string | undefined
let sessionCookie: string | undefined
let otherSessionCookie: string | undefined
const seededUserIds: string[] = []
const seededTeamIds: string[] = []

const jsonRequest = async (path: string, init: RequestInit = {}, cookie: string | null | undefined = sessionCookie): Promise<Response> => {
    if (!baseUrl) throw new Error('Test API has not started.')
    const headers = new Headers(init.headers)
    if (init.body) headers.set('Content-Type', 'application/json')
    if (init.method && ['POST', 'PATCH', 'DELETE'].includes(init.method)) headers.set('Origin', config.webOrigin)
    if (cookie) headers.set('Cookie', cookie)
    return fetch(new URL(path, baseUrl), {
        ...init,
        headers
    })
}

const makeSession = async (email: string, name: string, teamName: string): Promise<string> => {
    const repository = createAuthRepository()
    const identity = await repository.createAccount({ name, email, teamName, passwordHash: await hashPassword('integration-test-password') })
    seededUserIds.push(identity.id)
    seededTeamIds.push(identity.teamId)
    await repository.markEmailVerified(email)
    const token = createSessionToken()
    await repository.createSession({ userId: identity.id, tokenDigest: digestSessionToken(token), expiresAt: new Date(Date.now() + 60_000) })
    return `worklist_session=${token}`
}

before(async () => {
    if (!providedUri) return
    database = createMongoDbIntegration({ uri: isolatedUri(), logger })
    await database.connect()
    databaseConnected = true
    server = createServer({ app: createApp({ config, logger, database }), config, logger })
    await server.start()
    const address = server.raw.address()
    if (!address || typeof address === 'string') throw new Error('Test API did not bind to a TCP port.')
    baseUrl = `http://127.0.0.1:${String(address.port)}`
    sessionCookie = await makeSession(`worklist-test-${runId}-owner@example.test`, 'Test Owner', 'Owner Team')
    otherSessionCookie = await makeSession(`worklist-test-${runId}-other@example.test`, 'Other Owner', 'Other Team')
})

after(async () => {
    if (server) await server.stop()
    if (databaseConnected) {
        const teamIds = { $in: seededTeamIds }
        const userIds = { $in: seededUserIds }
        await Promise.all([
            WorkItemCommentModel.deleteMany({ teamId: teamIds }),
            WorkItemModel.deleteMany({ teamId: teamIds }),
            SavedViewModel.deleteMany({ teamId: teamIds }),
            AuthSessionModel.deleteMany({ userId: userIds }),
            AuthActionTokenModel.deleteMany({ email: { $regex: `^worklist-test-${runId}-` } }),
            AuthTeamModel.deleteMany({ _id: teamIds }),
            AuthUserModel.deleteMany({ _id: userIds })
        ])
    }
    if (database) await database.disconnect()
})

void test("Worklist API persists an owner's item and enforces team isolation", { skip: skipReason }, async () => {
    const unauthenticated = await jsonRequest('/work-items', {}, null)
    assert.equal(unauthenticated.status, 401)

    const createdResponse = await jsonRequest('/work-items', {
        method: 'POST',
        body: JSON.stringify({
            title: `Database-backed task ${runId}`,
            description: 'Saved through HTTP',
            status: 'To do',
            priority: 'High',
            assignee: 'Test Owner',
            dueDate: '2026-12-31'
        })
    })
    const createdBody = (await createdResponse.json()) as { item?: { id: string; title: string }; error?: unknown }
    assert.equal(createdResponse.status, 201, JSON.stringify(createdBody))
    const created = createdBody.item
    assert.ok(created)
    assert.equal(created.title, `Database-backed task ${runId}`)

    const ownerListResponse = await jsonRequest('/work-items')
    assert.equal(ownerListResponse.status, 200)
    const ownerList = (await ownerListResponse.json()) as { items: readonly { id: string }[] }
    assert.ok(ownerList.items.some((item) => item.id === created.id))

    const otherListResponse = await jsonRequest('/work-items', {}, otherSessionCookie)
    assert.equal(otherListResponse.status, 200)
    const otherList = (await otherListResponse.json()) as { items: readonly { id: string }[] }
    assert.ok(!otherList.items.some((item) => item.id === created.id))

    const updateResponse = await jsonRequest(`/work-items/${created.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Done' })
    })
    const updateBody = (await updateResponse.json()) as { item?: { status: string }; error?: unknown }
    assert.equal(updateResponse.status, 200, JSON.stringify(updateBody))
    assert.equal(updateBody.item?.status, 'Done')

    const deleteResponse = await jsonRequest(`/work-items/${created.id}`, { method: 'DELETE' })
    assert.equal(deleteResponse.status, 204)
    assert.equal(await WorkItemModel.countDocuments({ title: `Database-backed task ${runId}` }), 0)
})

void test('deleting a work item also deletes its persisted comments', { skip: skipReason }, async () => {
    const createdResponse = await jsonRequest('/work-items', {
        method: 'POST',
        body: JSON.stringify({ title: `Comment cleanup ${runId}`, dueDate: '2026-12-31' })
    })
    const createdBody = (await createdResponse.json()) as { item?: { id: string }; error?: unknown }
    assert.equal(createdResponse.status, 201, JSON.stringify(createdBody))
    const item = createdBody.item
    assert.ok(item)
    const commentResponse = await jsonRequest(`/work-items/${item.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: 'Persisted comment' })
    })
    const commentBody = (await commentResponse.json()) as { comment?: unknown; error?: unknown }
    assert.equal(commentResponse.status, 201, JSON.stringify(commentBody))
    assert.equal(await WorkItemCommentModel.countDocuments({ body: 'Persisted comment' }), 1)

    assert.equal((await jsonRequest(`/work-items/${item.id}`, { method: 'DELETE' })).status, 204)
    assert.equal(await WorkItemCommentModel.countDocuments({ body: 'Persisted comment' }), 0)
})
