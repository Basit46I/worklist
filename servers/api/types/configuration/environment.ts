import type { LogLevel } from '@workspace/logging'
import type { ApiEnvironment } from '@workspace/types'

export type ApiEnvironmentSource = Readonly<Record<string, string | undefined>>

export type ValidatedApiEnvironment = Readonly<{
    NODE_ENV: ApiEnvironment
    API_HOST: string
    API_PORT: number
    WEB_ORIGIN: string
    MONGODB_URI?: string | undefined
    SMTP_HOST?: string | undefined
    SMTP_PORT?: number | undefined
    SMTP_USER?: string | undefined
    SMTP_PASSWORD?: string | undefined
    EMAIL_FROM?: string | undefined
    LOG_LEVEL: LogLevel
}>
