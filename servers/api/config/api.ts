import type { ApiConfig, ValidatedApiEnvironment } from '../types/index.js'
import { apiRuntime } from '../constants/index.js'

export const createApiConfig = (environment: ValidatedApiEnvironment): ApiConfig =>
    Object.freeze({
        environment: environment.NODE_ENV,
        host: environment.API_HOST,
        port: environment.API_PORT,
        rateLimit: Object.freeze({
            max: environment.API_RATE_LIMIT_MAX ?? apiRuntime.rateLimitMax,
            windowMs: environment.API_RATE_LIMIT_WINDOW_MS ?? apiRuntime.rateLimitWindowMs
        }),
        trustProxyHops: environment.API_TRUST_PROXY_HOPS ?? 0,
        webOrigin: environment.WEB_ORIGIN,
        logLevel: environment.LOG_LEVEL,
        ...(environment.MONGODB_URI ? { mongodbUri: environment.MONGODB_URI } : {}),
        ...(environment.REDIS_URL ? { redisUrl: environment.REDIS_URL } : {}),
        ...(environment.SMTP_HOST && environment.SMTP_PORT && environment.SMTP_USER && environment.SMTP_PASSWORD && environment.EMAIL_FROM
            ? {
                  smtp: Object.freeze({
                      host: environment.SMTP_HOST,
                      port: environment.SMTP_PORT,
                      user: environment.SMTP_USER,
                      password: environment.SMTP_PASSWORD,
                      from: environment.EMAIL_FROM
                  })
              }
            : {})
    })
