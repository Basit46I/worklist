import assert from 'node:assert/strict'
import test from 'node:test'
import { request } from '../../features/worklist/api/client'

void test('API client sends credentialed JSON requests and preserves caller headers', async () => {
    const originalFetch = globalThis.fetch
    let captured: { input: RequestInfo | URL; init?: RequestInit } | undefined
    globalThis.fetch = async (input, init) => {
        captured = init === undefined ? { input } : { input, init }
        return new Response('{"ready":true}', { status: 200 })
    }
    try {
        assert.deepEqual(await request<{ ready: boolean }>('/ready', { method: 'GET', headers: { 'x-client': 'web' } }), { ready: true })
        assert.equal(captured?.input, '/api/ready')
        assert.equal(captured?.init?.credentials, 'include')
        assert.deepEqual(captured?.init?.headers, { 'Content-Type': 'application/json', 'x-client': 'web' })
    } finally {
        globalThis.fetch = originalFetch
    }
})

void test('API client handles empty responses and attaches request and trace IDs to server errors', async () => {
    const originalFetch = globalThis.fetch
    try {
        globalThis.fetch = async () => new Response(null, { status: 204 })
        assert.equal(await request<void>('/logout'), undefined)

        globalThis.fetch = async () => new Response('{"error":{"message":"Conflict"}}', {
            status: 409,
            headers: { 'x-request-id': 'req-123', 'x-trace-id': 'trace-456' }
        })
        await assert.rejects(request('/items'), /Conflict \(Request ID: req-123 · Trace ID: trace-456\)/)

        globalThis.fetch = async () => new Response('not json', { status: 503 })
        await assert.rejects(request('/ready'), /Request failed \(503\)\./)
    } finally {
        globalThis.fetch = originalFetch
    }
})
