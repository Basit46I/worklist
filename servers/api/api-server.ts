import 'dotenv/config'
import { createApiRuntime, createServer, createShutdown } from './bootstrap/index.js'

const { config, logger, database, rateLimitStore, telemetry, app } = createApiRuntime()
const server = createServer({ app, config, logger })

const shutdown = createShutdown({ database, logger, server, telemetry, ...(rateLimitStore ? { rateLimitStore } : {}) })

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
