import type { ApiErrorCode } from '@workspace/types'

export const ERROR_CODES = Object.freeze({
    internal: 'internal_error',
    routeNotFound: 'route_not_found',
    validation: 'validation_error',
    unauthenticated: 'unauthenticated',
    forbidden: 'forbidden',
    conflict: 'conflict',
    rateLimited: 'rate_limited',
    unavailable: 'service_unavailable'
} as const satisfies Readonly<Record<string, ApiErrorCode>>)
