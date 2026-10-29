import { timingSafeEqual } from 'node:crypto'
import type { Request, RequestHandler, Response } from 'express'
import { z } from 'zod'
import { HTTP_STATUS } from '../../../constants/index.js'
import type { AuthIdentity } from '../../auth/public.js'
import type { OperationsRouteDependencies } from '../routes/index.js'

type RequestWithIdentity = Request & Readonly<{ authIdentity?: AuthIdentity }>
type JsonResponse = Pick<Response, 'json' | 'setHeader' | 'status' | 'send' | 'end'>

const createBearerGuard = (token: string): RequestHandler => (request, response, next) => {
    const authorization = request.get('authorization') ?? ''
    const suppliedToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
    const expected = Buffer.from(token)
    const supplied = Buffer.from(suppliedToken)
    const authorized = expected.length === supplied.length && timingSafeEqual(expected, supplied)
    if (!authorized) {
        response.status(HTTP_STATUS.unauthorized).json({ error: { code: 'unauthenticated', message: 'A valid metrics token is required.' } })
        return
    }
    next()
}

const canViewOperations = (identity: AuthIdentity | undefined, response: JsonResponse): identity is AuthIdentity => {
    if (identity?.role === 'owner') return true
    response.status(identity ? HTTP_STATUS.forbidden : HTTP_STATUS.unauthorized).json({
        error: { code: identity ? 'forbidden' : 'unauthenticated', message: identity ? 'Owner access is required.' : 'Authentication is required.' }
    })
    return false
}

const parseLogQuery = (query: Request['query']) => z.object({
    search: z.string().trim().max(120).default(''),
    level: z.enum(['all', 'info', 'warn', 'error']).default('all'),
    before: z.iso.datetime().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50)
}).parse(query)

export type OperationsControllerDependencies = OperationsRouteDependencies
export type OperationsControllers = Readonly<{
    metricsBearerGuard: RequestHandler
    metricsExport: RequestHandler
    operationsMetrics: RequestHandler
    operationsLogs: RequestHandler
}>

export const createOperationsController = ({ metrics, logs, isPersistenceAvailable, otlpExportConfigured, metricsBearerToken }: OperationsControllerDependencies): OperationsControllers => {
    const metricsBearerGuard: RequestHandler = metricsBearerToken
        ? createBearerGuard(metricsBearerToken)
        : (_request, response) => response.status(HTTP_STATUS.notFound).end()

    const metricsExport: RequestHandler = async (_request, response: JsonResponse) => {
        response.setHeader('Content-Type', metrics.contentType)
        response.setHeader('Cache-Control', 'no-store')
        response.status(HTTP_STATUS.ok).send(await metrics.render())
    }

    const operationsMetrics: RequestHandler = async (request, response: JsonResponse) => {
        const identity = (request as RequestWithIdentity).authIdentity
        if (!canViewOperations(identity, response)) return
        response.setHeader('Cache-Control', 'no-store')
        const metricsSnapshot = await metrics.snapshot()
        const alerts = [
            ...(!isPersistenceAvailable()
                ? [{ id: 'database-unavailable', severity: 'critical' as const, title: 'Database is unavailable', detail: 'Persistence is not connected on this function instance.' }]
                : []),
            ...metricsSnapshot.alerts
        ]
        response.status(HTTP_STATUS.ok).json({
            service: 'Worklist API',
            viewer: { name: identity.name, teamName: identity.teamName },
            health: { api: 'healthy', database: isPersistenceAvailable() ? 'available' : 'unavailable' },
            telemetry: { otlpExportConfigured },
            metrics: { ...metricsSnapshot, alerts }
        })
    }

    const operationsLogs: RequestHandler = async (request, response: JsonResponse) => {
        const identity = (request as RequestWithIdentity).authIdentity
        if (!canViewOperations(identity, response)) return
        const { before, ...searchQuery } = parseLogQuery(request.query)
        response.setHeader('Cache-Control', 'no-store')
        response.json(await logs.search({ teamId: identity.teamId, ...searchQuery, ...(before ? { before: new Date(before) } : {}) }))
    }

    return Object.freeze({ metricsBearerGuard, metricsExport, operationsMetrics, operationsLogs })
}
