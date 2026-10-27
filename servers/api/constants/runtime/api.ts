export const apiRuntime = Object.freeze({
    serviceName: 'api',
    jsonBodyLimit: '1mb',
    rateLimitWindowMs: 60_000,
    rateLimitMax: 1_000,
    requestTimeoutMs: 30_000,
    headersTimeoutMs: 15_000
})
