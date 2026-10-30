import test from 'node:test'
import assert from 'node:assert/strict'
import type { Logger } from '@workspace/logging'
import { createApp, createServer } from '../bootstrap/index.js'
import { ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS } from '../constants/index.js'
import type { ApiConfig } from '../types/index.js'

const logger: Logger = {
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined
}
const config: ApiConfig = {
    environment: 'test',
    host: '127.0.0.1',
    port: 0,
    rateLimit: { max: 1_000, windowMs: 60_000 },
    webOrigin: 'http://localhost:3000',
    logLevel: 'silent'
}

void test('unknown routes use the API error boundary', async (context) => {
    const server = createServer({ app: createApp({ config, logger }), config, logger })
    await server.start()
    context.after(async () => {
        await server.stop()
    })
    const address = server.raw.address()
    assert.ok(address && typeof address === 'object')
    const response = await fetch(`http://127.0.0.1:${String(address.port)}/missing`)
    assert.equal(response.status, HTTP_STATUS.notFound)
    assert.deepEqual(await response.json(), {
        error: {
            code: ERROR_CODES.routeNotFound,
            message: ERROR_MESSAGES.routeNotFound,
            details: { method: 'GET', path: '/missing' }
        }
    })
})

void test('applies the configured API rate limit and keeps health probes available', async (context) => {
    const limitedConfig: ApiConfig = { ...config, rateLimit: { max: 1, windowMs: 60_000 } }
    const server = createServer({ app: createApp({ config: limitedConfig, logger }), config: limitedConfig, logger })
    await server.start()
    context.after(async () => {
        await server.stop()
    })
    const address = server.raw.address()
    assert.ok(address && typeof address === 'object')
    const origin = `http://127.0.0.1:${String(address.port)}`
    assert.equal((await fetch(`${origin}/missing`)).status, HTTP_STATUS.notFound)
    const limited = await fetch(`${origin}/missing`)
    assert.equal(limited.status, HTTP_STATUS.tooManyRequests)
    assert.deepEqual(await limited.json(), {
        error: { code: ERROR_CODES.rateLimited, message: ERROR_MESSAGES.rateLimited }
    })
    assert.equal((await fetch(`${origin}/health`)).status, HTTP_STATUS.ok)
    assert.equal((await fetch(`${origin}/ready`)).status, HTTP_STATUS.serviceUnavailable)
    assert.equal((await fetch(`${origin}/auth/session`, { method: 'OPTIONS' })).status, HTTP_STATUS.noContent)
})

void test('allows cross-origin task update preflights with the concurrency header', async (context) => {
    const server = createServer({ app: createApp({ config, logger }), config, logger })
    await server.start()
    context.after(async () => server.stop())
    const address = server.raw.address()
    assert.ok(address && typeof address === 'object')

    const response = await fetch(`http://127.0.0.1:${String(address.port)}/work-items/example`, {
        method: 'OPTIONS',
        headers: {
            Origin: config.webOrigin,
            'Access-Control-Request-Method': 'PATCH',
            'Access-Control-Request-Headers': 'content-type,if-match'
        }
    })

    assert.equal(response.status, HTTP_STATUS.noContent)
    assert.equal(response.headers.get('access-control-allow-origin'), config.webOrigin)
    assert.match(response.headers.get('access-control-allow-headers') ?? '', /if-match/i)
    assert.match(response.headers.get('access-control-allow-methods') ?? '', /patch/i)
})

void test('applies the request limit consistently during a concurrent burst', async (context) => {
    const limit = 25
    const total = 100
    const limitedConfig: ApiConfig = { ...config, rateLimit: { max: limit, windowMs: 60_000 } }
    const server = createServer({ app: createApp({ config: limitedConfig, logger }), config: limitedConfig, logger })
    await server.start()
    context.after(async () => server.stop())
    const address = server.raw.address()
    assert.ok(address && typeof address === 'object')
    const origin = `http://127.0.0.1:${String(address.port)}`
    const statuses = await Promise.all(Array.from({ length: total }, async () => {
        const response = await fetch(`${origin}/missing`)
        await response.arrayBuffer()
        return response.status
    }))
    assert.equal(statuses.filter((status) => status === HTTP_STATUS.notFound).length, limit)
    assert.equal(statuses.filter((status) => status === HTTP_STATUS.tooManyRequests).length, total - limit)
})

void test('uses the configured trusted proxy hop count to separate client rate-limit buckets', async (context) => {
    const proxyConfig: ApiConfig = { ...config, rateLimit: { max: 1, windowMs: 60_000 }, trustProxyHops: 1 }
    const server = createServer({ app: createApp({ config: proxyConfig, logger }), config: proxyConfig, logger })
    await server.start()
    context.after(async () => server.stop())
    const address = server.raw.address()
    assert.ok(address && typeof address === 'object')
    const origin = `http://127.0.0.1:${String(address.port)}`
    const request = (clientIp: string) => fetch(`${origin}/missing`, { headers: { 'x-forwarded-for': clientIp } })

    assert.equal((await request('192.0.2.1')).status, HTTP_STATUS.notFound)
    assert.equal((await request('192.0.2.2')).status, HTTP_STATUS.notFound)
    assert.equal((await request('192.0.2.1')).status, HTTP_STATUS.tooManyRequests)
})
