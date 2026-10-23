import express, { type Express } from 'express'
import type { Logger } from '@workspace/logging'
import type { ApiConfig } from '../types/index.js'
import { apiRuntime } from '../constants/index.js'
import { createHealthRoutes } from '../features/health/index.js'
import { createAuthRoutes } from '../features/auth/index.js'
import { createWorkItemRoutes } from '../features/worklist/index.js'
import { createWorkItemEventHub } from '../features/worklist/index.js'
import { createSmtpEmailSender } from '../integrations/index.js'
import type { MongoDbIntegration } from '../integrations/index.js'
import { createCorsMiddleware, createErrorHandler, createNotFoundHandler, createRequestTelemetry } from '../middleware/index.js'

type AppDependencies = Readonly<{ config: ApiConfig; logger: Logger; database?: Pick<MongoDbIntegration, 'isConnected'> }>

export const createApp = ({ config, logger, database }: AppDependencies): Express => {
    const app = express()
    app.disable('x-powered-by')
    app.use(createRequestTelemetry(logger))
    const webOrigins =
        config.environment === 'development'
            ? [...new Set([config.webOrigin, 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'])]
            : [config.webOrigin]
    app.use(createCorsMiddleware({ origins: webOrigins }))
    app.use(express.json({ limit: apiRuntime.jsonBodyLimit }))
    const workItemEvents = createWorkItemEventHub()
    const emailSender = config.smtp ? createSmtpEmailSender(config.smtp) : undefined
    const featureRouters = [
        createHealthRoutes({
            environment: config.environment,
            serviceName: apiRuntime.serviceName,
            isPersistenceAvailable: database?.isConnected ?? (() => false)
        }),
        createAuthRoutes({
            webOrigins,
            secureCookies: config.environment === 'production',
            isPersistenceAvailable: database?.isConnected ?? (() => false),
            ...(emailSender ? { emailSender } : {})
        }),
        createWorkItemRoutes(webOrigins, database?.isConnected ?? (() => false), workItemEvents)
    ]
    for (const featureRouter of featureRouters) app.use(featureRouter)
    app.use(createNotFoundHandler())
    app.use(createErrorHandler({ logger }))
    return app
}
