import type { createApiRuntime as createApiRuntimeType } from './bootstrap/index.js'

type ApiRuntimeFactory = typeof createApiRuntimeType
type ApiBootstrapModule = Readonly<{
    createApiRuntime?: ApiRuntimeFactory
    default?: Readonly<{ createApiRuntime?: ApiRuntimeFactory }>
}>

const apiBootstrap = (await import('./bootstrap/index.js')) as unknown as ApiBootstrapModule
const createApiRuntime = apiBootstrap.createApiRuntime ?? apiBootstrap.default?.createApiRuntime

if (!createApiRuntime) throw new Error('The API bootstrap module does not expose createApiRuntime.')

const environment = Object.freeze({
    ...process.env,
    NODE_ENV: process.env.NODE_ENV ?? 'production',
    API_HOST: process.env.API_HOST ?? '0.0.0.0',
    API_PORT: process.env.API_PORT ?? '3000',
    LOG_LEVEL: process.env.LOG_LEVEL ?? 'info'
})
const { app, database, rateLimitStore, logger } = createApiRuntime(environment)

try {
    await database.connect()
    if (rateLimitStore) await rateLimitStore.connect()
} catch (error) {
    logger.error('API function initialization failed.', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: error instanceof Error ? error.message : String(error),
        ...(error instanceof Error && error.stack ? { errorStack: error.stack } : {}),
        vercelRegion: process.env.VERCEL_REGION,
        vercelRequestId: process.env.VERCEL_REQUEST_ID
    })
    throw error
}

logger.info('API function initialized.')

export default app
