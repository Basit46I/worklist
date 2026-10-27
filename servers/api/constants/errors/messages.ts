export const ERROR_MESSAGES = Object.freeze({
    internal: 'An unexpected error occurred.',
    routeNotFound: 'Route was not found.',
    validation: 'Request validation failed.',
    unauthenticated: 'Authentication is required.',
    forbidden: 'This action is not allowed.',
    conflict: 'A resource with these details already exists.',
    rateLimited: 'Too many requests. Please try again later.',
    unavailable: 'The service is temporarily unavailable.'
} as const)
