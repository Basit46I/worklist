import express, { type Express } from 'express'
import type { Logger } from '@workspace/logging'
import type { ApiConfig } from '../types/index.js'
import { apiRuntime } from '../constants/index.js'
import { createHealthRoutes } from '../features/health/index.js'
import { createAuthRoutes } from '../features/auth/index.js'
import { createWorkItemRoutes } from '../features/worklist/index.js'
import { createWorkItemEventHub } from '../features/worklist/index.js'
import { createOperationsRoutes } from '../features/operations/index.js'
import { createAlertWebhook, createSmtpEmailSender } from '../integrations/index.js'
import type { MongoDbIntegration } from '../integrations/index.js'
import type { RateLimitStoreFactory } from '../integrations/index.js'
import { createPrometheusIntegration } from '../integrations/index.js'
import { createOperationsLogRepository } from '../features/operations/index.js'
import { createApiRateLimit, createCorsMiddleware, createErrorHandler, createNotFoundHandler, createRequestTelemetry } from '../middleware/index.js'

type AppDependencies = Readonly<{
    config: ApiConfig
    logger: Logger
    database?: Pick<MongoDbIntegration, 'isConnected'>
    rateLimitStoreFactory?: RateLimitStoreFactory
}>

export const createApp = ({ config, logger, database, rateLimitStoreFactory }: AppDependencies): Express => {
    const app = express()
    app.disable('x-powered-by')
    app.set('trust proxy', config.trustProxyHops ?? 0)
    const metrics = createPrometheusIntegration()
    const logs = createOperationsLogRepository(logger)
    const alertWebhook = createAlertWebhook(config.alertWebhookUrl, logger)
    const persistenceAvailable = database?.isConnected ?? (() => false)
    app.use(createRequestTelemetry({ logger, metrics, logs, alerts: alertWebhook, isPersistenceAvailable: persistenceAvailable }))
    app.use(createApiRateLimit({ ...config.rateLimit, ...(rateLimitStoreFactory ? { store: rateLimitStoreFactory('api-global') } : {}) }))
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
            isPersistenceAvailable: persistenceAvailable
        }),
        createAuthRoutes({
            webOrigins,
            secureCookies: config.environment === 'production',
            isPersistenceAvailable: persistenceAvailable,
            ...(rateLimitStoreFactory ? { rateLimitStoreFactory } : {}),
            ...(emailSender ? { emailSender } : {})
        }),
        createWorkItemRoutes(webOrigins, persistenceAvailable, workItemEvents, rateLimitStoreFactory, { webOrigin: config.webOrigin, ...(config.cronSecret ? { cronSecret: config.cronSecret } : {}), ...(emailSender ? { emailSender } : {}) }),
        createOperationsRoutes({
            metrics,
            logs,
            isPersistenceAvailable: persistenceAvailable,
            otlpExportConfigured: Boolean(config.telemetry),
            ...(config.metricsBearerToken ? { metricsBearerToken: config.metricsBearerToken } : {})
        })
    ]
    for (const featureRouter of featureRouters) app.use(featureRouter)
    app.use(createNotFoundHandler())
    app.use(createErrorHandler({ logger }))
    return app
}
