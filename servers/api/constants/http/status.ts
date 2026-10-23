export const HTTP_STATUS = Object.freeze({
    ok: 200,
    accepted: 202,
    created: 201,
    noContent: 204,
    badRequest: 400,
    multiStatus: 207,
    unauthorized: 401,
    forbidden: 403,
    tooManyRequests: 429,
    conflict: 409,
    notFound: 404,
    serviceUnavailable: 503,
    internalServerError: 500
} as const)
