import { validateApiEnvironment } from '../validation/env.validation.js'
import type { ApiEnvironmentSource, ValidatedApiEnvironment } from '../types/index.js'

export const readApiEnvironment = (source: ApiEnvironmentSource = process.env): ValidatedApiEnvironment =>
    validateApiEnvironment({
        NODE_ENV: source.NODE_ENV,
        API_HOST: source.API_HOST,
        API_PORT: source.API_PORT,
        API_RATE_LIMIT_MAX: source.API_RATE_LIMIT_MAX,
        API_RATE_LIMIT_WINDOW_MS: source.API_RATE_LIMIT_WINDOW_MS,
        API_TRUST_PROXY_HOPS: source.API_TRUST_PROXY_HOPS,
        WEB_ORIGIN: source.WEB_ORIGIN,
        MONGODB_URI: source.MONGODB_URI,
        REDIS_URL: source.REDIS_URL,
        SMTP_HOST: source.SMTP_HOST,
        SMTP_PORT: source.SMTP_PORT,
        SMTP_USER: source.SMTP_USER,
        SMTP_PASSWORD: source.SMTP_PASSWORD,
        EMAIL_FROM: source.EMAIL_FROM,
        LOG_LEVEL: source.LOG_LEVEL
    })
