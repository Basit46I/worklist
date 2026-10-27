import 'dotenv/config'
import { createLogger } from '@workspace/logging'
import { createApp, createServer, createShutdown } from './bootstrap/index.js'
import { createApiConfig, readApiEnvironment } from './config/index.js'
import { apiRuntime } from './constants/index.js'
import { createMongoDbIntegration, createRedisRateLimitStore } from './integrations/index.js'

const config = createApiConfig(readApiEnvironment())
const logger = createLogger({
    service: apiRuntime.serviceName,
    level: config.logLevel,
    format: config.environment === 'production' ? 'json' : 'pretty'
})
const database = createMongoDbIntegration({
    logger,
    ...(config.mongodbUri ? { uri: config.mongodbUri } : {})
})
const rateLimitStore = config.redisUrl ? createRedisRateLimitStore({ url: config.redisUrl, namespace: config.environment, logger }) : undefined
const app = createApp({ config, logger, database, ...(rateLimitStore ? { rateLimitStoreFactory: rateLimitStore.createStore } : {}) })
const server = createServer({ app, config, logger })

const shutdown = createShutdown({ database, logger, server, ...(rateLimitStore ? { rateLimitStore } : {}) })

await database.connect()
if (rateLimitStore) await rateLimitStore.connect()
await server.start()

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
        void shutdown(signal)
            .then(() => process.exit(0))
            .catch((error: unknown) => {
                logger.error('API shutdown failed.', { error: error instanceof Error ? error.message : String(error) })
                process.exit(1)
            })
    })
}
