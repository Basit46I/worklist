import type { LogLevel } from '@workspace/logging'
import type { ApiEnvironment } from '@workspace/types'

export type ApiEnvironmentSource = Readonly<Record<string, string | undefined>>

export type ValidatedApiEnvironment = Readonly<{
    NODE_ENV: ApiEnvironment
    API_HOST: string
    API_PORT: number
    API_RATE_LIMIT_MAX?: number | undefined
    API_RATE_LIMIT_WINDOW_MS?: number | undefined
    API_TRUST_PROXY_HOPS?: number | undefined
    WEB_ORIGIN: string
    MONGODB_URI?: string | undefined
    REDIS_URL?: string | undefined
    SMTP_HOST?: string | undefined
    SMTP_PORT?: number | undefined
    SMTP_USER?: string | undefined
    SMTP_PASSWORD?: string | undefined
    EMAIL_FROM?: string | undefined
    CRON_SECRET?: string | undefined
    METRICS_BEARER_TOKEN?: string | undefined
    ALERT_WEBHOOK_URL?: string | undefined
    OTEL_EXPORTER_OTLP_ENDPOINT?: string | undefined
    OTEL_EXPORTER_OTLP_HEADERS?: string | undefined
    LOG_LEVEL: LogLevel
}>
