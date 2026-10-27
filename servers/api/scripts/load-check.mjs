import { createLoadPhases, parseLoadOptions } from './load-check-options.mjs'
import { summarizeLoadResults } from './load-check-metrics.mjs'
import { runLoadPhase } from './load-check-phase.mjs'

const { mode, target, requests, concurrency, expectedStatus } = parseLoadOptions(process.argv.slice(2))
const phases = createLoadPhases({ mode, requests, concurrency })
const timeoutMs = 10_000
const startedAt = performance.now()
const results = []
for (const phase of phases) results.push(await runLoadPhase({ target, mode, expectedStatus, timeoutMs, ...phase }))
const summary = summarizeLoadResults({ target, mode, requests, concurrency, expectedStatus, durationMs: performance.now() - startedAt, phases: results })
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`)
if (summary.failures > 0) process.exitCode = 1
