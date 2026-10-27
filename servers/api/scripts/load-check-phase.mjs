import { summarizeLatencies } from './load-check-metrics.mjs'

const isExpectedResponse = ({ status, expectedStatus, mode }) => status === expectedStatus || (mode === 'stress' && status === 429)

export const runLoadPhase = async ({ target, mode, expectedStatus, requests, concurrency, timeoutMs }) => {
    const latencies = []
    const failures = []
    const statuses = new Map()
    let nextRequest = 0
    const startedAt = performance.now()

    const requestWorker = async () => {
        while (nextRequest < requests) {
            const requestId = nextRequest
            nextRequest += 1
            const requestStartedAt = performance.now()
            try {
                const response = await fetch(target, { signal: AbortSignal.timeout(timeoutMs) })
                latencies.push(performance.now() - requestStartedAt)
                statuses.set(response.status, (statuses.get(response.status) ?? 0) + 1)
                if (!isExpectedResponse({ status: response.status, expectedStatus, mode })) {
                    failures.push({ requestId, status: response.status, expectedStatus })
                }
                await response.body?.cancel()
            } catch (error) {
                failures.push({ requestId, error: error instanceof Error ? error.message : String(error) })
            }
        }
    }

    await Promise.all(Array.from({ length: Math.min(concurrency, requests) }, requestWorker))
    const durationMs = performance.now() - startedAt
    return Object.freeze({
        requests,
        concurrency,
        failures,
        statuses,
        latencies,
        requestsPerSecond: Math.round(requests / (durationMs / 1_000)),
        latencyMs: summarizeLatencies(latencies)
    })
}
