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
        ...(environment.CRON_SECRET ? { cronSecret: environment.CRON_SECRET } : {}),
        logLevel: environment.LOG_LEVEL,
        ...(environment.METRICS_BEARER_TOKEN ? { metricsBearerToken: environment.METRICS_BEARER_TOKEN } : {}),
        ...(environment.ALERT_WEBHOOK_URL ? { alertWebhookUrl: environment.ALERT_WEBHOOK_URL } : {}),
        ...(environment.OTEL_EXPORTER_OTLP_ENDPOINT
            ? { telemetry: Object.freeze({ endpoint: environment.OTEL_EXPORTER_OTLP_ENDPOINT, ...(environment.OTEL_EXPORTER_OTLP_HEADERS ? { headers: environment.OTEL_EXPORTER_OTLP_HEADERS } : {}) }) }
            : {}),
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
