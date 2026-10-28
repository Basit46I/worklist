import type { RequestHandler } from 'express'
import type { Logger } from '@workspace/logging'

export const createRequestTelemetry =
    (logger: Logger): RequestHandler =>
    (request, response, next) => {
        const startedAt = performance.now()
        response.once('finish', () => {
            const routePath: unknown = (request as unknown as Readonly<{ route?: Readonly<{ path?: unknown }> }>).route?.path
            const routeSegment = typeof routePath === 'string' ? routePath : ''
            const route = routeSegment ? `${request.baseUrl}${routeSegment}` : 'unmatched'
            logger.info('API request completed', {
                method: request.method,
                route,
                statusCode: response.statusCode,
                durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
                vercelRequestId: request.get('x-vercel-id')
            })
        })
        next()
    }
