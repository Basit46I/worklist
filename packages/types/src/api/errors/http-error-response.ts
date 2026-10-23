export type ApiErrorCode =
    'internal_error' | 'route_not_found' | 'validation_error' | 'unauthenticated' | 'forbidden' | 'conflict' | 'rate_limited' | 'service_unavailable'

export type ApiErrorDetails = Readonly<Record<string, unknown>> | readonly unknown[]

export type ApiErrorResponse = Readonly<{
    error: Readonly<{
        code: ApiErrorCode
        message: string
        details?: ApiErrorDetails
    }>
}>
