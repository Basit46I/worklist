import type { LogLevel } from '@workspace/logging'
import type { ApiEnvironment } from '@workspace/types'

export type ApiConfig = Readonly<{
    environment: ApiEnvironment
    host: string
    port: number
    rateLimit: Readonly<{ max: number; windowMs: number }>
    trustProxyHops?: number
    webOrigin: string
    mongodbUri?: string
    redisUrl?: string
    smtp?: Readonly<{ host: string; port: number; user: string; password: string; from: string }>
    logLevel: LogLevel
}>
