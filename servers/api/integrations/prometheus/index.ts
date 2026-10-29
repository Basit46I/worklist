import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from '@prometheus-io/client'
import { metrics as openTelemetryMetrics } from '@opentelemetry/api'

type RequestLabels = Readonly<{ method: string; route: string; status_code: string }>
type RequestObservation = RequestLabels & Readonly<{ durationMs: number }>

export type OperationsMetrics = Readonly<{
    contentType: string
    recordRequest: (observation: RequestObservation) => void
    render: () => Promise<string>
    snapshot: () => Promise<OperationsMetricsSnapshot>
}>

export type OperationsMetricsSnapshot = Readonly<{
    scope: 'current function instance'
    generatedAt: string
    uptimeSeconds: number
    nodeVersion: string
    memory: Readonly<{ rssBytes: number; heapUsedBytes: number; heapTotalBytes: number }>
    requests: Readonly<{ total: number; errors: number; serverErrors: number; averageLatencyMs: number; routes: readonly RouteMetric[] }>
    alerts: readonly OperationsAlert[]
}>

export type OperationsAlert = Readonly<{ id: string; severity: 'warning' | 'critical'; title: string; detail: string }>
type RouteMetric = Readonly<{ route: string; method: string; requests: number; errors: number; serverErrors: number; errorRatePercent: number; averageLatencyMs: number; p95LatencyMs: number }>
type RequestMetricLabels = Readonly<{ method?: string | number; route?: string | number; status_code?: string | number; le?: string | number }>
type LabeledValue = Readonly<{ labels: RequestMetricLabels; value: number; metricName?: string }>

const readRoute = (labels: Readonly<Record<string, string | number>>): string => String(labels.route ?? 'unmatched')
const readMethod = (labels: Readonly<Record<string, string | number>>): string => String(labels.method ?? 'UNKNOWN')
const isErrorStatus = (labels: Readonly<Record<string, string | number>>): boolean => Number(labels.status_code) >= 400

export const createPrometheusIntegration = (): OperationsMetrics => {
    const registry = new Registry()
    collectDefaultMetrics({ register: registry })
    const requests = new Counter<'method' | 'route' | 'status_code'>({
        name: 'worklist_api_http_requests_total',
        help: 'Completed API requests by normalized route, method and status code.',
        labelNames: ['method', 'route', 'status_code'],
        registers: [registry]
    })
    const duration = new Histogram<'method' | 'route' | 'status_code'>({
        name: 'worklist_api_http_request_duration_seconds',
        help: 'API request duration in seconds by normalized route, method and status code.',
        labelNames: ['method', 'route', 'status_code'],
        buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
        registers: [registry]
    })
    const fleetRequests = openTelemetryMetrics.getMeter('worklist-api').createCounter('worklist.api.http.server.request.count', {
        description: 'Completed API requests by normalized route, method and status code.'
    })
    const fleetDuration = openTelemetryMetrics.getMeter('worklist-api').createHistogram('worklist.api.http.server.request.duration', {
        description: 'API request duration in milliseconds by normalized route, method and status code.',
        unit: 'ms'
    })
    new Gauge({
        name: 'worklist_api_process_uptime_seconds',
        help: 'Uptime in seconds of this API function instance.',
        registers: [registry],
        collect() {
            this.set(process.uptime())
        }
    })

    const snapshot = async (): Promise<OperationsMetricsSnapshot> => {
        const [requestMetric, durationMetric] = await Promise.all([requests.get(), duration.get()])
        const requestValues: readonly LabeledValue[] = requestMetric.values
        const durationValues: readonly LabeledValue[] = durationMetric.values
        const routeStats = new Map<string, { route: string; method: string; requests: number; errors: number; serverErrors: number; durationSum: number; durationCount: number }>()
        const latencyStats = new Map<string, { count: number; sum: number; buckets: Map<number, number> }>()

        for (const value of requestValues) {
            const route = readRoute(value.labels)
            const method = readMethod(value.labels)
            const key = `${method}:${route}`
            const current = routeStats.get(key) ?? { route, method, requests: 0, errors: 0, serverErrors: 0, durationSum: 0, durationCount: 0 }
            current.requests += value.value
            if (isErrorStatus(value.labels)) current.errors += value.value
            if (Number(value.labels.status_code) >= 500) current.serverErrors += value.value
            routeStats.set(key, current)
        }
        for (const value of durationValues) {
            const key = `${readMethod(value.labels)}:${readRoute(value.labels)}`
            const current = latencyStats.get(key) ?? { count: 0, sum: 0, buckets: new Map<number, number>() }
            if (value.metricName?.endsWith('_sum')) current.sum += value.value
            if (value.metricName?.endsWith('_count')) current.count += value.value
            if (value.metricName?.endsWith('_bucket')) {
                const bound = Number(value.labels.le)
                if (!Number.isNaN(bound)) current.buckets.set(bound, (current.buckets.get(bound) ?? 0) + value.value)
            }
            latencyStats.set(key, current)
        }

        const routes = [...routeStats.values()]
            .map(({ ...route }) => {
                const latency = latencyStats.get(`${route.method}:${route.route}`)
                const p95Target = (latency?.count ?? 0) * 0.95
                let p95Bound = 0
                for (const [bound, count] of [...(latency?.buckets ?? [])].sort(([left], [right]) => left - right)) {
                    if (count >= p95Target) { p95Bound = bound; break }
                    p95Bound = bound
                }
                return Object.freeze({
                    ...route,
                    errorRatePercent: route.requests ? Math.round((route.errors / route.requests) * 1000) / 10 : 0,
                    averageLatencyMs: latency?.count ? Math.round((latency.sum / latency.count) * 1000) : 0,
                    p95LatencyMs: latency?.count ? (Number.isFinite(p95Bound) ? Math.ceil(p95Bound * 1000) : Math.ceil((latency.sum / latency.count) * 1000)) : 0
                })
            })
            .sort((left, right) => right.requests - left.requests)
        const total = routes.reduce((sum, route) => sum + route.requests, 0)
        const errors = routes.reduce((sum, route) => sum + route.errors, 0)
        const serverErrors = routes.reduce((sum, route) => sum + route.serverErrors, 0)
        const weightedLatency = routes.reduce((sum, route) => sum + route.averageLatencyMs * route.requests, 0)
        const memory = process.memoryUsage()

        const alerts: OperationsAlert[] = []
        if (total >= 20 && serverErrors / total >= 0.05) {
            const errorRate = String(Math.round((serverErrors / total) * 100))
            alerts.push(Object.freeze({ id: 'api-server-error-rate', severity: serverErrors / total >= 0.2 ? 'critical' : 'warning', title: 'API server error rate is elevated', detail: `${errorRate}% of requests returned a 5xx response on this instance.` }))
        }
        if (total >= 10 && routes.some((route) => route.averageLatencyMs >= 1_000)) {
            alerts.push(Object.freeze({ id: 'api-latency', severity: 'warning', title: 'API response time is high', detail: 'At least one route is averaging 1 second or more on this instance.' }))
        }

        return Object.freeze({
            scope: 'current function instance',
            generatedAt: new Date().toISOString(),
            uptimeSeconds: Math.floor(process.uptime()),
            nodeVersion: process.version,
            memory: Object.freeze({ rssBytes: memory.rss, heapUsedBytes: memory.heapUsed, heapTotalBytes: memory.heapTotal }),
            requests: Object.freeze({
                total,
                errors,
                serverErrors,
                averageLatencyMs: total ? Math.round(weightedLatency / total) : 0,
                routes: Object.freeze(routes)
            }),
            alerts: Object.freeze(alerts)
        })
    }

    return Object.freeze({
        contentType: registry.contentType,
        recordRequest: ({ durationMs, method, route, status_code }) => {
            const labels = { method, route, status_code }
            requests.inc(labels)
            duration.observe(labels, Math.max(0, durationMs) / 1000)
            fleetRequests.add(1, { 'http.request.method': method, 'http.route': route, 'http.response.status_code': Number(status_code) })
            fleetDuration.record(Math.max(0, durationMs), { 'http.request.method': method, 'http.route': route, 'http.response.status_code': Number(status_code) })
        },
        render: () => registry.metrics(),
        snapshot
    })
}
