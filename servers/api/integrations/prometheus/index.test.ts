import test from 'node:test'
import assert from 'node:assert/strict'
import { createPrometheusIntegration } from './index.js'

void test('records normalized routes and derives latency, error rates and alert thresholds', async () => {
    const metrics = createPrometheusIntegration()
    const empty = await metrics.snapshot()
    assert.equal(empty.requests.total, 0)
    assert.equal(empty.requests.averageLatencyMs, 0)
    assert.deepEqual(empty.alerts, [])

    for (let index = 0; index < 20; index += 1) {
        metrics.recordRequest({ method: 'PATCH', route: '/work-items/:itemId', status_code: '500', durationMs: 1_500 })
    }
    for (let index = 0; index < 10; index += 1) {
        metrics.recordRequest({ method: 'GET', route: '/work-items', status_code: '200', durationMs: 40 })
    }
    const snapshot = await metrics.snapshot()

    assert.equal(snapshot.scope, 'current function instance')
    assert.equal(snapshot.requests.total, 30)
    assert.equal(snapshot.requests.errors, 20)
    assert.equal(snapshot.requests.serverErrors, 20)
    assert.equal(snapshot.requests.averageLatencyMs, 1_013)
    const busiestRoute = snapshot.requests.routes[0]
    assert.ok(busiestRoute)
    assert.equal(busiestRoute.route, '/work-items/:itemId')
    assert.equal(busiestRoute.errorRatePercent, 100)
    assert.ok(snapshot.alerts.some(({ id, severity }) => id === 'api-server-error-rate' && severity === 'critical'))
    assert.ok(snapshot.alerts.some(({ id }) => id === 'api-latency'))

    const exposition = await metrics.render()
    assert.match(exposition, /worklist_api_http_requests_total/)
    assert.match(exposition, /worklist_api_http_request_duration_seconds/)
    assert.match(exposition, /worklist_api_process_uptime_seconds/)
})

void test('does not alert below the minimum traffic thresholds and clamps negative duration', async () => {
    const metrics = createPrometheusIntegration()
    metrics.recordRequest({ method: 'GET', route: 'unmatched', status_code: '404', durationMs: -5 })
    const snapshot = await metrics.snapshot()
    assert.deepEqual(snapshot.alerts, [])
    const unmatchedRoute = snapshot.requests.routes[0]
    assert.ok(unmatchedRoute)
    assert.equal(unmatchedRoute.route, 'unmatched')
    assert.equal(unmatchedRoute.method, 'GET')
    assert.equal(unmatchedRoute.averageLatencyMs, 0)
})
