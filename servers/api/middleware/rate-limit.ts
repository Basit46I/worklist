import { rateLimit } from 'express-rate-limit'
import type { Store } from 'express-rate-limit'
import { ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS } from '../constants/index.js'

type RateLimitSettings = Readonly<{ max: number; windowMs: number; store?: Store }>

const rateLimitHandler = () => (_request: unknown, response: { status: (code: number) => { json: (body: unknown) => void } }): void => {
    response.status(HTTP_STATUS.tooManyRequests).json({
        error: { code: ERROR_CODES.rateLimited, message: ERROR_MESSAGES.rateLimited }
    })
}

export const createApiRateLimit = ({ max, windowMs, store }: RateLimitSettings) =>
    rateLimit({
        windowMs,
        limit: max,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        skip: (request) => request.method === 'OPTIONS' || request.path === '/health' || request.path === '/ready',
        handler: rateLimitHandler(),
        ...(store ? { store } : {})
    })
