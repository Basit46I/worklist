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
        webOrigin: 'https://example.test',
        logLevel: 'warn'
    })
})

void test('rejects invalid server environment input', () => {
    assert.throws(() => readApiEnvironment({ API_PORT: '70000' }))
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
