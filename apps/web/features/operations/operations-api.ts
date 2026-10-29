import { z } from 'zod'
import { apiBaseUrl } from '../worklist/public'

const routeMetricSchema = z.object({
    route: z.string(),
    method: z.string(),
    requests: z.number(),
    errors: z.number(),
    serverErrors: z.number(),
    errorRatePercent: z.number(),
    averageLatencyMs: z.number(),
    p95LatencyMs: z.number()
})

const operationsResponseSchema = z.object({
    service: z.string(),
    viewer: z.object({ name: z.string(), teamName: z.string() }),
    health: z.object({ api: z.enum(['healthy']), database: z.enum(['available', 'unavailable']) }),
    telemetry: z.object({ otlpExportConfigured: z.boolean() }),
    metrics: z.object({
        scope: z.literal('current function instance'),
        generatedAt: z.string(),
        uptimeSeconds: z.number(),
        nodeVersion: z.string(),
        memory: z.object({ rssBytes: z.number(), heapUsedBytes: z.number(), heapTotalBytes: z.number() }),
        requests: z.object({ total: z.number(), errors: z.number(), serverErrors: z.number(), averageLatencyMs: z.number(), routes: z.array(routeMetricSchema) }),
        alerts: z.array(z.object({ id: z.string(), severity: z.enum(['warning', 'critical']), title: z.string(), detail: z.string() }))
    })
})

export type OperationsSnapshot = z.infer<typeof operationsResponseSchema>

const operationsLogsSchema = z.object({
    logs: z.array(z.object({
        id: z.string(), level: z.enum(['info', 'warn', 'error']), message: z.string(), createdAt: z.string(),
        method: z.string(), route: z.string(), statusCode: z.number(), durationMs: z.number(), requestId: z.string(),
        traceId: z.string().optional(), spanId: z.string().optional(), userId: z.string().optional(), teamId: z.string().optional()
    })),
    nextBefore: z.string().nullable()
})

export type OperationsLogsPage = z.infer<typeof operationsLogsSchema>

export const fetchOperationsSnapshot = async (): Promise<OperationsSnapshot> => {
    const response = await fetch(`${apiBaseUrl}/operations/metrics`, { credentials: 'include', cache: 'no-store' })
    if (!response.ok) {
        if (response.status === 401) throw new Error('Sign in with an owner account to view operations.')
        if (response.status === 403) throw new Error('Operations access is limited to workspace owners.')
        throw new Error(`Operations data could not be loaded (${response.status}).`)
    }
    const parsed = operationsResponseSchema.safeParse(await response.json())
    if (!parsed.success) throw new Error('The API returned an invalid operations snapshot.')
    return parsed.data
}

export const fetchOperationsLogs = async (query: Readonly<{ search: string; level: 'all' | 'info' | 'warn' | 'error'; before?: string }>): Promise<OperationsLogsPage> => {
    const params = new URLSearchParams({ search: query.search, level: query.level, limit: '50' })
    if (query.before) params.set('before', query.before)
    const response = await fetch(`${apiBaseUrl}/operations/logs?${params}`, { credentials: 'include', cache: 'no-store' })
    if (!response.ok) throw new Error(response.status === 401 ? 'Sign in with an owner account to view logs.' : response.status === 403 ? 'Log access is limited to workspace owners.' : `Logs could not be loaded (${response.status}).`)
    const parsed = operationsLogsSchema.safeParse(await response.json())
    if (!parsed.success) throw new Error('The API returned an invalid log search result.')
    return parsed.data
}
