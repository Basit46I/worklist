import type { Logger } from '@workspace/logging'
import type { MongoDbIntegration, RedisRateLimitStore } from '../integrations/index.js'
import type { ApiServer } from './create-server.js'

type ShutdownDependencies = Readonly<{
    database: Pick<MongoDbIntegration, 'disconnect'>
    logger: Logger
    server: Pick<ApiServer, 'stop'>
    rateLimitStore?: Pick<RedisRateLimitStore, 'disconnect'>
}>

export const createShutdown =
    ({ database, logger, server, rateLimitStore }: ShutdownDependencies) =>
    async (signal: NodeJS.Signals): Promise<void> => {
        logger.info('API shutdown requested.', { signal })
        await server.stop()
        await database.disconnect()
        if (rateLimitStore) await rateLimitStore.disconnect()
    }
