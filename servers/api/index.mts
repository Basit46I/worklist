import type { createApiRuntime as createApiRuntimeFactory } from './bootstrap/create-runtime.js'

type ApiRuntimeModule = {
    createApiRuntime?: typeof createApiRuntimeFactory
    default?: { createApiRuntime?: typeof createApiRuntimeFactory }
}

const runtimeModule = (await import('./bootstrap/index.js')) as unknown as ApiRuntimeModule
const createApiRuntime = runtimeModule.createApiRuntime ?? runtimeModule.default?.createApiRuntime

if (createApiRuntime === undefined) throw new Error('API runtime factory is unavailable.')

const environment = Object.freeze({
    ...process.env,
    NODE_ENV: process.env.NODE_ENV ?? 'production',
    API_HOST: process.env.API_HOST ?? '0.0.0.0',
    API_PORT: process.env.API_PORT ?? '3000',
    LOG_LEVEL: process.env.LOG_LEVEL ?? 'info'
})
const { app, database, rateLimitStore, logger } = createApiRuntime(environment)

await database.connect()
if (rateLimitStore) await rateLimitStore.connect()

logger.info('API function initialized.')

export default app
