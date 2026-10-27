import test from 'node:test'
import assert from 'node:assert/strict'
import { ZodError } from 'zod'
import { createApiConfig, readApiEnvironment } from '../config/index.js'

void test('derives API configuration from validated environment input', () => {
    const environment = readApiEnvironment({
        NODE_ENV: 'production',
        API_HOST: '0.0.0.0',
        API_PORT: '8080',
        WEB_ORIGIN: 'https://example.test',
        LOG_LEVEL: 'warn'
    })
    assert.deepEqual(createApiConfig(environment), {
        environment: 'production',
        host: '0.0.0.0',
        port: 8080,
        rateLimit: { max: 1_000, windowMs: 60_000 },
        trustProxyHops: 0,
        webOrigin: 'https://example.test',
        logLevel: 'warn'
    })
})

void test('configures a shared Redis limit store and a bounded trusted proxy chain', () => {
    const environment = readApiEnvironment({
        NODE_ENV: 'production',
        API_HOST: '0.0.0.0',
        API_PORT: '4000',
        API_TRUST_PROXY_HOPS: '1',
        REDIS_URL: 'rediss://cache.example.test:6380',
        WEB_ORIGIN: 'https://example.test',
        LOG_LEVEL: 'warn'
    })
    const config = createApiConfig(environment)
    assert.equal(config.redisUrl, 'rediss://cache.example.test:6380')
    assert.equal(config.trustProxyHops, 1)
})

void test('accepts explicit API request-rate-limit settings', () => {
    const environment = readApiEnvironment({
        NODE_ENV: 'test',
        API_HOST: '127.0.0.1',
        API_PORT: '4000',
        API_RATE_LIMIT_MAX: '25',
        API_RATE_LIMIT_WINDOW_MS: '5000',
        WEB_ORIGIN: 'http://localhost:3000',
        LOG_LEVEL: 'silent'
    })
    assert.deepEqual(createApiConfig(environment).rateLimit, { max: 25, windowMs: 5_000 })
})

void test('rejects invalid server environment input', () => {
    assert.throws(() => readApiEnvironment({ API_PORT: '70000' }))
    assert.throws(() => readApiEnvironment({ API_TRUST_PROXY_HOPS: '-1' }))
    assert.throws(() => readApiEnvironment({ REDIS_URL: 'https://cache.example.test' }))
})

void test('requires runtime values from the environment', () => {
    assert.throws(() => readApiEnvironment({}), ZodError)
})

void test('maps complete SMTP environment settings into the API configuration', () => {
    const environment = readApiEnvironment({
        NODE_ENV: 'test',
        API_HOST: '127.0.0.1',
        API_PORT: '4000',
        WEB_ORIGIN: 'http://localhost:3000',
        LOG_LEVEL: 'silent',
        SMTP_HOST: 'smtp.example.test',
        SMTP_PORT: '587',
        SMTP_USER: 'worklist',
        SMTP_PASSWORD: 'local-test-secret',
        EMAIL_FROM: 'Worklist <no-reply@example.test>'
    })

    assert.deepEqual(createApiConfig(environment).smtp, {
        host: 'smtp.example.test',
        port: 587,
        user: 'worklist',
        password: 'local-test-secret',
        from: 'Worklist <no-reply@example.test>'
    })
})

void test('requires every SMTP setting when email delivery is enabled', () => {
    assert.throws(
        () =>
            readApiEnvironment({
                NODE_ENV: 'test',
                API_HOST: '127.0.0.1',
                API_PORT: '4000',
                WEB_ORIGIN: 'http://localhost:3000',
                LOG_LEVEL: 'silent',
                SMTP_HOST: 'smtp.example.test'
            }),
        ZodError
    )
})
