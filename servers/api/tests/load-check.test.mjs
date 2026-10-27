import assert from 'node:assert/strict'
import { execFile as executeFile } from 'node:child_process'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import test from 'node:test'
import { createLoadPhases, parseLoadOptions } from '../scripts/load-check-options.mjs'
import { summarizeLatencies, summarizeLoadResults } from '../scripts/load-check-metrics.mjs'

const execFile = promisify(executeFile)

void test('load-check parses pnpm forwarding arguments and creates a gradual stress profile', () => {
    const options = parseLoadOptions(['--', '--mode', 'stress', '--url', 'http://127.0.0.1:4000/health', '--requests', '80', '--concurrency', '8'])
    assert.equal(options.requests, 80)
    assert.equal(options.concurrency, 8)
    assert.equal(options.expectedStatus, 401)
    assert.deepEqual(createLoadPhases(options), [
        { requests: 20, concurrency: 2 },
        { requests: 20, concurrency: 4 },
        { requests: 20, concurrency: 6 },
        { requests: 20, concurrency: 8 }
    ])
})

void test('summarizes latency percentiles and aggregates load phases', () => {
    assert.deepEqual(summarizeLatencies([40, 10, 30, 20]), { p50: 20, p95: 40, p99: 40 })
    assert.deepEqual(summarizeLatencies([]), { p50: null, p95: null, p99: null })
    const summary = summarizeLoadResults({
        target: new URL('http://127.0.0.1:4000/auth/session'),
        mode: 'stress',
        requests: 4,
        concurrency: 2,
        expectedStatus: 401,
        durationMs: 2_000,
        phases: [
            { requests: 2, concurrency: 1, failures: [], statuses: new Map([[401, 1], [429, 1]]), latencies: [10, 20], requestsPerSecond: 100, latencyMs: { p50: 10, p95: 20, p99: 20 } },
            { requests: 2, concurrency: 2, failures: [{ requestId: 1, status: 500, expectedStatus: 401 }], statuses: new Map([[401, 1], [500, 1]]), latencies: [30, 40], requestsPerSecond: 50, latencyMs: { p50: 30, p95: 40, p99: 40 } }
        ]
    })
    assert.equal(summary.failures, 1)
    assert.equal(summary.rateLimitedResponses, 1)
    assert.deepEqual(summary.statusCounts, { 401: 2, 429: 1, 500: 1 })
    assert.deepEqual(summary.latencyMs, { p50: 20, p95: 40, p99: 40 })
    assert.equal(summary.phases.length, 2)
})

void test('stress profile sends concurrent requests and reports each load step', async (context) => {
    let activeRequests = 0
    let peakConcurrency = 0
    let acceptedRequests = 0
    const server = createServer((_request, response) => {
        activeRequests += 1
        peakConcurrency = Math.max(peakConcurrency, activeRequests)
        setTimeout(() => {
            acceptedRequests += 1
            const status = acceptedRequests <= 50 ? 200 : 429
            response.writeHead(status, { 'content-type': 'application/json' })
            response.end(JSON.stringify({ status }))
            activeRequests -= 1
        }, 12)
    })
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    context.after(async () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())))
    const address = server.address()
    assert.ok(address && typeof address === 'object')
    const script = fileURLToPath(new URL('../scripts/load-check.mjs', import.meta.url))
    const { stdout } = await execFile(process.execPath, [script, '--', '--mode', 'stress', '--url', `http://127.0.0.1:${String(address.port)}/health`, '--expect-status', '200', '--requests', '80', '--concurrency', '8'])
    const summary = JSON.parse(stdout)
    assert.equal(summary.failures, 0)
    assert.equal(summary.statusCounts['200'], 50)
    assert.equal(summary.statusCounts['429'], 30)
    assert.equal(summary.rateLimitedResponses, 30)
    assert.deepEqual(summary.phases.map(({ concurrency }) => concurrency), [2, 4, 6, 8])
    assert.ok(peakConcurrency >= 8)
})
