import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import type { Logger } from '@workspace/logging'
import type { RedisStore } from 'rate-limit-redis'
import { HTTP_STATUS } from '../constants/index.js'
import { createApp, createServer } from '../bootstrap/index.js'
import { createRedisRateLimitStore } from '../integrations/index.js'
import type { ApiConfig } from '../types/index.js'

const testRedisUrl = process.env.WORKLIST_TEST_REDIS_URL

void test('creates isolated shared Redis rate-limit stores and owns connection lifecycle', async () => {
    const calls: string[] = []
    let onError: ((error: Error) => void) | undefined
    const logger: Logger = {
        info: () => undefined,
        warn: (message) => { calls.push(`warn:${message}`) },
        error: () => undefined
    }
    const integration = createRedisRateLimitStore({
        url: 'redis://cache.example.test:6379',
        namespace: 'production',
        logger,
        client: {
            connect: () => {
                calls.push('connect')
                return Promise.resolve()
            },
            close: () => {
                calls.push('close')
                return Promise.resolve()
            },
            sendCommand: () => Promise.resolve('ok'),
            onError: (listener) => { onError = listener }
        }
    })
    const globalStore = integration.createStore('api-global') as RedisStore
    const loginStore = integration.createStore('auth-login') as RedisStore
    assert.notEqual(globalStore, loginStore)
    assert.equal(globalStore.prefix, 'worklist:production:rate-limit:api-global:')
    assert.equal(loginStore.prefix, 'worklist:production:rate-limit:auth-login:')
    assert.throws(() => integration.createStore('invalid scope'))

    await integration.connect()
    onError?.(new Error('redis unavailable'))
    await integration.disconnect()
    assert.deepEqual(calls, [
        'connect',
        'warn:Redis rate-limit connection error.',
        'close'
    ])
})

void test('shares a rate limit across API instances when a test Redis is configured', { skip: !testRedisUrl }, async (context) => {
    const logger: Logger = { info: () => undefined, warn: () => undefined, error: () => undefined }
    const namespace = `test-${randomUUID()}`
    const firstStore = createRedisRateLimitStore({ url: testRedisUrl ?? '', namespace, logger })
    const secondStore = createRedisRateLimitStore({ url: testRedisUrl ?? '', namespace, logger })
    const config: ApiConfig = {
        environment: 'test',
        host: '127.0.0.1',
        port: 0,
        rateLimit: { max: 2, windowMs: 60_000 },
        webOrigin: 'http://localhost:3000',
        logLevel: 'silent'
    }
    const firstServer = createServer({ app: createApp({ config, logger, rateLimitStoreFactory: firstStore.createStore }), config, logger })
    const secondServer = createServer({ app: createApp({ config, logger, rateLimitStoreFactory: secondStore.createStore }), config, logger })
    await Promise.all([firstStore.connect(), secondStore.connect()])
    await Promise.all([firstServer.start(), secondServer.start()])
    context.after(async () => {
        await Promise.all([firstServer.stop(), secondServer.stop()])
        await Promise.all([firstStore.disconnect(), secondStore.disconnect()])
    })
    const firstAddress = firstServer.raw.address()
    const secondAddress = secondServer.raw.address()
    assert.ok(firstAddress && typeof firstAddress === 'object')
    assert.ok(secondAddress && typeof secondAddress === 'object')
    const firstUrl = `http://127.0.0.1:${String(firstAddress.port)}/missing`
    const secondUrl = `http://127.0.0.1:${String(secondAddress.port)}/missing`
    const request = async (url: string) => {
        const response = await fetch(url)
        await response.arrayBuffer()
        return response.status
    }

    assert.equal(await request(firstUrl), HTTP_STATUS.notFound)
    assert.equal(await request(secondUrl), HTTP_STATUS.notFound)
    assert.equal(await request(firstUrl), HTTP_STATUS.tooManyRequests)
})
