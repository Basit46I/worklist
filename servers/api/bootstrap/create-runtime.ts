import { createLogger } from '@workspace/logging'
import { createApp } from './create-app.js'
import { createApiConfig, readApiEnvironment } from '../config/index.js'
import type { ApiEnvironmentSource } from '../types/index.js'
import { apiRuntime } from '../constants/index.js'
import { createMongoDbIntegration, createOpenTelemetryIntegration, createRedisRateLimitStore } from '../integrations/index.js'

export const createApiRuntime = (source?: ApiEnvironmentSource) => {
    const config = createApiConfig(readApiEnvironment(source))
    const logger = createLogger({
        service: apiRuntime.serviceName,
        level: config.logLevel,
        format: config.environment === 'production' ? 'json' : 'pretty'
    })
    const telemetry = createOpenTelemetryIntegration(config.telemetry)
    const database = createMongoDbIntegration({ logger, ...(config.mongodbUri ? { uri: config.mongodbUri } : {}) })
    const rateLimitStore = config.redisUrl ? createRedisRateLimitStore({ url: config.redisUrl, namespace: config.environment, logger }) : undefined
    const app = createApp({ config, logger, database, ...(rateLimitStore ? { rateLimitStoreFactory: rateLimitStore.createStore } : {}) })

    return Object.freeze({ config, logger, database, rateLimitStore, telemetry, app })
}
