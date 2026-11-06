import test from 'node:test'
import assert from 'node:assert/strict'
import type { Request, Response } from 'express'
import { createOperationsController } from '../controllers/operations.controller.js'
import type { AuthIdentity } from '../../auth/public.js'

/* eslint-disable @typescript-eslint/require-await -- observability adapters expose asynchronous read methods. */

const owner: AuthIdentity = { id: 'owner-1', name: 'Owner', email: 'owner@example.test', teamId: 'team-1', teamName: 'Design', role: 'owner' }
const viewer: AuthIdentity = { ...owner, id: 'viewer-1', role: 'viewer' }

const harness = (options: Readonly<{ persistence?: boolean; token?: string }> = {}) => {
    const calls: unknown[] = []
    const state: { status?: number; body?: unknown; sent?: unknown; headers: Record<string, string>; ended: boolean } = { headers: {}, ended: false }
    const metrics = {
        contentType: 'text/plain; version=0.0.4',
        render: async () => 'worklist_api_http_requests_total 1',
        snapshot: async () => ({ scope: 'current function instance', generatedAt: '2026-11-05T00:00:00.000Z', uptimeSeconds: 1, nodeVersion: 'v22', memory: { rssBytes: 1, heapUsedBytes: 1, heapTotalBytes: 1 }, requests: { total: 1, errors: 0, serverErrors: 0, averageLatencyMs: 2, routes: [] }, alerts: [] })
    }
    const controller = createOperationsController({
        metrics: metrics as never,
        logs: { search: async (query: unknown) => { calls.push(query); return { logs: [], nextBefore: null } } } as never,
        isPersistenceAvailable: () => options.persistence ?? true,
        otlpExportConfigured: true,
        ...(options.token === undefined ? {} : { metricsBearerToken: options.token })
    })
    const response = {
        status(code: number) { state.status = code; return this },
        json(body: unknown) { state.body = body; return this },
        send(body: unknown) { state.sent = body; return this },
        end() { state.ended = true; return this },
        setHeader(name: string, value: string) { state.headers[name] = value; return this }
    } as unknown as Response
    const invoke = async (handler: (request: Request, response: Response, next: () => void) => unknown, identity?: AuthIdentity, query: Request['query'] = {}, authorization = '') => {
        const request = { query, authIdentity: identity, get: (name: string) => name === 'authorization' ? authorization : undefined } as unknown as Request
        await handler(request, response, () => { calls.push('next') })
    }
    return { calls, state, controller, invoke }
}

void test('metrics export requires a configured matching bearer token and exposes Prometheus text', async () => {
    const { controller, state, invoke, calls } = harness({ token: 'secret-token' })
    await invoke(controller.metricsBearerGuard, undefined, {}, 'Bearer wrong')
    assert.equal(state.status, 401)
    assert.deepEqual(state.body, { error: { code: 'unauthenticated', message: 'A valid metrics token is required.' } })
    await invoke(controller.metricsBearerGuard, undefined, {}, 'Bearer secret-token')
    assert.deepEqual(calls, ['next'])
    await invoke(controller.metricsExport)
    assert.equal(state.status, 200)
    assert.equal(state.sent, 'worklist_api_http_requests_total 1')
    assert.equal(state.headers['Content-Type'], 'text/plain; version=0.0.4')
    assert.equal(state.headers['Cache-Control'], 'no-store')
})

void test('metrics are owner-only and include persistence availability and telemetry state', async () => {
    const { controller, state, invoke } = harness({ persistence: false })
    await invoke(controller.operationsMetrics)
    assert.equal(state.status, 401)
    await invoke(controller.operationsMetrics, viewer)
    assert.equal(state.status, 403)
    await invoke(controller.operationsMetrics, owner)
    assert.equal(state.status, 200)
    assert.deepEqual(state.body, {
        service: 'Worklist API', viewer: { name: 'Owner', teamName: 'Design' },
        health: { api: 'healthy', database: 'unavailable' }, telemetry: { otlpExportConfigured: true },
        metrics: { scope: 'current function instance', generatedAt: '2026-11-05T00:00:00.000Z', uptimeSeconds: 1, nodeVersion: 'v22', memory: { rssBytes: 1, heapUsedBytes: 1, heapTotalBytes: 1 }, requests: { total: 1, errors: 0, serverErrors: 0, averageLatencyMs: 2, routes: [] }, alerts: [{ id: 'database-unavailable', severity: 'critical', title: 'Database is unavailable', detail: 'Persistence is not connected on this function instance.' }] }
    })
})

void test('central logs are team-scoped, parse paging filters and reject invalid filters', async () => {
    const { controller, calls, state, invoke } = harness()
    await invoke(controller.operationsLogs, owner, { search: '  PATCH /items  ', level: 'error', outcome: 'slow', before: '2026-11-04T12:00:00.000Z', limit: '7' })
    assert.deepEqual(calls[0], { teamId: 'team-1', search: 'PATCH /items', level: 'error', outcome: 'slow', limit: 7, before: new Date('2026-11-04T12:00:00.000Z') })
    assert.equal(state.headers['Cache-Control'], 'no-store')

    await assert.rejects(() => invoke(controller.operationsLogs, owner, { level: 'fatal' }), /Invalid option/)
})
