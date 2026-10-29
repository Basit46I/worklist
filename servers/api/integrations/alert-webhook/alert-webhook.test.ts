import test from 'node:test'
import assert from 'node:assert/strict'
import { createAlertWebhook } from './index.js'
import type { Logger } from '@workspace/logging'

const logger: Logger = Object.freeze({ info: () => undefined, warn: () => undefined, error: () => undefined })

void test('alert webhook is disabled without a destination', async () => {
    const notifier = createAlertWebhook(undefined, logger)
    assert.equal(notifier.enabled, false)
    await notifier.publish([{ id: 'api-latency', severity: 'warning', title: 'Slow API', detail: 'Latency is high.' }])
})

void test('alert webhook sends active alerts and suppresses repeats during its cooldown', async () => {
    const originalFetch = globalThis.fetch
    const requests: RequestInit[] = []
    globalThis.fetch = (_input, init) => {
        requests.push(init ?? {})
        return Promise.resolve(new Response(null, { status: 204 }))
    }
    try {
        const notifier = createAlertWebhook('https://hooks.example.test/alerts', logger)
        const alerts = [{ id: 'api-latency', severity: 'warning' as const, title: 'Slow API', detail: 'Latency is high.' }]
        assert.equal(notifier.enabled, true)
        await notifier.publish(alerts)
        await notifier.publish(alerts)
        assert.equal(requests.length, 1)
        const request = requests.at(0)
        assert.ok(request)
        assert.equal(request.method, 'POST')
        if (typeof request.body !== 'string') throw new Error('Expected a JSON webhook body.')
        assert.deepEqual(JSON.parse(request.body), { text: '[WARNING] Slow API: Latency is high.' })
        await notifier.publish([])
        await notifier.publish(alerts)
        assert.equal(requests.length, 2)
    } finally {
        globalThis.fetch = originalFetch
    }
})
