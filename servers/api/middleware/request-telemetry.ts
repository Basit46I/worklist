import type { RequestHandler } from 'express'
import { context, isSpanContextValid, propagation, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api'
import type { Logger } from '@workspace/logging'
import { randomUUID } from 'node:crypto'
import type { OperationsMetrics } from '../integrations/index.js'
import type { AlertNotifier } from '../integrations/index.js'
import type { OperationsAlert } from '../integrations/index.js'

type OperationsLogEntry = Readonly<{
    level: 'info' | 'warn' | 'error'
    message: string
    createdAt: Date
    method: string
    route: string
    statusCode: number
    errorCode?: string
    errorMessage?: string
    durationMs: number
    requestId: string
    traceId?: string
    spanId?: string
    userId?: string
    teamId?: string
}>

type RequestWithIdentity = Readonly<{ authIdentity?: Readonly<{ id: string; teamId: string }> }>
type OperationsError = Readonly<{ code: string; message: string }>

export const createRequestTelemetry =
    ({ logger, metrics, logs, alerts, isPersistenceAvailable }: Readonly<{ logger: Logger; metrics: OperationsMetrics; logs?: Readonly<{ append: (entry: OperationsLogEntry) => Promise<void> }>; alerts?: AlertNotifier; isPersistenceAvailable?: () => boolean }>): RequestHandler =>
    (request, response, next) => {
        const startedAt = performance.now()
        const requestedId = request.get('x-vercel-id') ?? request.get('x-request-id')
        const requestId = requestedId && /^[A-Za-z0-9._:-]{1,128}$/.test(requestedId) ? requestedId : randomUUID()
        response.setHeader('x-request-id', requestId)
        const parentContext = propagation.extract(context.active(), request.headers)
        const span = trace.getTracer('worklist-api').startSpan(`${request.method} request`, { kind: SpanKind.SERVER }, parentContext)
        const spanContext = span.spanContext()
        const hasTrace = isSpanContextValid(spanContext)
        if (hasTrace) response.setHeader('x-trace-id', spanContext.traceId)
        response.once('finish', () => {
            const routePath: unknown = (request as unknown as Readonly<{ route?: Readonly<{ path?: unknown }> }>).route?.path
            const routeSegment = typeof routePath === 'string' ? routePath : ''
            const route = routeSegment ? `${request.baseUrl}${routeSegment}` : 'unmatched'
            const durationMs = Math.max(0, Math.round(performance.now() - startedAt))
            const identity = (request as typeof request & RequestWithIdentity).authIdentity
            const operationsError = response.locals.operationsError as OperationsError | undefined
            span.updateName(`${request.method} ${route}`)
            span.setAttribute('http.request.method', request.method)
            span.setAttribute('http.route', route)
            span.setAttribute('http.response.status_code', response.statusCode)
            span.setAttribute('http.server.request.duration_ms', durationMs)
            if (response.statusCode >= 500) span.setStatus({ code: SpanStatusCode.ERROR })
            span.end()
            metrics.recordRequest({ method: request.method, route, status_code: String(response.statusCode), durationMs })
            const entry: OperationsLogEntry = {
                level: response.statusCode >= 500 ? 'error' : response.statusCode >= 400 ? 'warn' : 'info',
                message: 'API request completed',
                method: request.method,
                route,
                statusCode: response.statusCode,
                ...(operationsError ? { errorCode: operationsError.code, errorMessage: operationsError.message.slice(0, 500) } : {}),
                durationMs,
                requestId,
                createdAt: new Date(),
                ...(hasTrace ? { traceId: spanContext.traceId, spanId: spanContext.spanId } : {}),
                ...(identity ? { userId: identity.id, teamId: identity.teamId } : {})
            }
            logger[entry.level]('API request completed', entry)
            if (logs) void logs.append(entry)
            if (alerts?.enabled) {
                void metrics.snapshot().then((current) => {
                    const activeAlerts: OperationsAlert[] = [
                        ...current.alerts,
                        ...(isPersistenceAvailable && !isPersistenceAvailable()
                            ? [{ id: 'database-unavailable', severity: 'critical' as const, title: 'Database is unavailable', detail: 'Persistence is not connected on this function instance.' }]
                            : [])
                    ]
                    return alerts.publish(activeAlerts)
                }).catch(() => undefined)
            }
        })
        context.with(trace.setSpan(parentContext, span), next)
    }
