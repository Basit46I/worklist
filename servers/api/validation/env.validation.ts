import { z } from 'zod'
import type { ValidatedApiEnvironment } from '../types/index.js'

export const apiEnvironmentSchema = z
    .object({
        NODE_ENV: z.enum(['development', 'test', 'production']),
        API_HOST: z.string().min(1),
        API_PORT: z.coerce.number().int().min(1).max(65_535),
        API_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(1_000_000).optional(),
        API_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1_000).max(86_400_000).optional(),
        API_TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).optional(),
        WEB_ORIGIN: z.url(),
        MONGODB_URI: z.string().min(1).optional(),
        REDIS_URL: z.string().refine((value) => {
            try {
                return ['redis:', 'rediss:'].includes(new URL(value).protocol)
            } catch {
                return false
            }
        }, 'REDIS_URL must use redis:// or rediss://.').optional(),
        SMTP_HOST: z.string().min(1).optional(),
        SMTP_PORT: z.coerce.number().int().min(1).max(65_535).optional(),
        SMTP_USER: z.string().min(1).optional(),
        SMTP_PASSWORD: z.string().min(1).optional(),
        EMAIL_FROM: z.string().min(3).optional(),
        CRON_SECRET: z.string().min(32).optional(),
        METRICS_BEARER_TOKEN: z.string().min(32).optional(),
        ALERT_WEBHOOK_URL: z.url({ protocol: /^https$/ }).optional(),
        OTEL_EXPORTER_OTLP_ENDPOINT: z.url({ protocol: /^https?$/ }).optional(),
        OTEL_EXPORTER_OTLP_HEADERS: z.string().min(1).optional(),
        LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    })
    .superRefine((value, context) => {
        const smtpValues = [value.SMTP_HOST, value.SMTP_PORT, value.SMTP_USER, value.SMTP_PASSWORD, value.EMAIL_FROM]
        if (smtpValues.some((entry) => entry !== undefined) && smtpValues.some((entry) => entry === undefined)) {
            context.addIssue({
                code: 'custom',
                message: 'SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and EMAIL_FROM must be configured together.'
            })
        }
    }) satisfies z.ZodType<ValidatedApiEnvironment>

export const validateApiEnvironment = (input: unknown): ValidatedApiEnvironment => Object.freeze(apiEnvironmentSchema.parse(input))
