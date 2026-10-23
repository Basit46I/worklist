import { validateApiEnvironment } from '../validation/env.validation.js'
import type { ApiEnvironmentSource, ValidatedApiEnvironment } from '../types/index.js'

export const readApiEnvironment = (source: ApiEnvironmentSource = process.env): ValidatedApiEnvironment =>
    validateApiEnvironment({
        NODE_ENV: source.NODE_ENV,
        API_HOST: source.API_HOST,
        API_PORT: source.API_PORT,
        WEB_ORIGIN: source.WEB_ORIGIN,
        MONGODB_URI: source.MONGODB_URI,
        SMTP_HOST: source.SMTP_HOST,
        SMTP_PORT: source.SMTP_PORT,
        SMTP_USER: source.SMTP_USER,
        SMTP_PASSWORD: source.SMTP_PASSWORD,
        EMAIL_FROM: source.EMAIL_FROM,
        LOG_LEVEL: source.LOG_LEVEL
    })
