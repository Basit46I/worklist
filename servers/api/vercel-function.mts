type ApiRuntimeFactory = (typeof import('./bootstrap/index.js'))['createApiRuntime']
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

await database.connect()
if (rateLimitStore) await rateLimitStore.connect()

logger.info('API function initialized.')

export default app
