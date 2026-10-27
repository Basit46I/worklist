import type { RequestHandler } from 'express'
import { rateLimit, type RateLimitRequestHandler, type Store } from 'express-rate-limit'
import { createAuthRateLimitHandler } from './auth.controller.js'

type AuthRateLimitDependencies = Readonly<{
    storeFactory?: (scope: string) => Store
    onLimit: RequestHandler
}>

export type AuthRateLimiters = Readonly<{
    register: RateLimitRequestHandler
    login: RateLimitRequestHandler
    email: RateLimitRequestHandler
}>

export const createAuthRateLimits = ({ storeFactory, onLimit }: AuthRateLimitDependencies): AuthRateLimiters => {
    const createLimiter = (windowMs: number, limit: number, scope: string): RateLimitRequestHandler =>
        rateLimit({
            windowMs,
            limit,
            standardHeaders: 'draft-8',
            legacyHeaders: false,
            handler: onLimit,
            ...(storeFactory ? { store: storeFactory(scope) } : {})
        })

    return Object.freeze({
        register: createLimiter(60 * 60 * 1_000, 5, 'auth-register'),
        login: createLimiter(15 * 60 * 1_000, 10, 'auth-login'),
        email: createLimiter(60 * 60 * 1_000, 5, 'auth-email')
    })
}

export const createDefaultAuthRateLimits = (storeFactory?: (scope: string) => Store): AuthRateLimiters =>
    createAuthRateLimits({ ...(storeFactory ? { storeFactory } : {}), onLimit: createAuthRateLimitHandler() })
