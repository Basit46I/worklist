const percentile = (values, rank) => (values.length ? Math.round(values[Math.min(values.length - 1, Math.ceil(rank * values.length) - 1)]) : null)

export const summarizeLatencies = (values) => {
    const sortedValues = [...values].sort((left, right) => left - right)
    return Object.freeze({
        p50: percentile(sortedValues, 0.5),
        p95: percentile(sortedValues, 0.95),
        p99: percentile(sortedValues, 0.99)
    })
}

export const summarizeLoadResults = ({ target, mode, requests, concurrency, expectedStatus, durationMs, phases }) => {
    const statusCounts = new Map()
    const failures = []
    const latencies = []

    for (const phase of phases) {
        latencies.push(...phase.latencies)
        failures.push(...phase.failures.map((failure) => ({ ...failure, concurrency: phase.concurrency })))
        for (const [status, count] of phase.statuses) statusCounts.set(status, (statusCounts.get(status) ?? 0) + count)
    }

    return Object.freeze({
        target: target.toString(),
        mode,
        requests,
        concurrency,
        expectedStatus,
        failures: failures.length,
        rateLimitedResponses: statusCounts.get(429) ?? 0,
        requestsPerSecond: Math.round(requests / (durationMs / 1_000)),
        statusCounts: Object.fromEntries([...statusCounts.entries()].sort(([left], [right]) => left - right)),
        latencyMs: summarizeLatencies(latencies),
        ...(mode === 'stress'
            ? {
                  phases: phases.map(({ requests: count, concurrency: level, failures: phaseFailures, requestsPerSecond, latencyMs }) => ({
                      requests: count,
                      concurrency: level,
                      failures: phaseFailures.length,
                      requestsPerSecond,
                      latencyMs
                  }))
              }
            : {}),
        sampleFailures: failures.slice(0, 5)
    })
}
