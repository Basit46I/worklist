import type { RequestHandler } from 'express'
import { HTTP_STATUS } from '../constants/index.js'

export const createCorsMiddleware =
    ({ origins }: { origins: readonly string[] }): RequestHandler =>
    (request, response, next) => {
        const origin = request.get('origin')
        if (origin && origins.includes(origin)) {
            response.setHeader('Access-Control-Allow-Origin', origin)
            response.setHeader('Access-Control-Allow-Credentials', 'true')
            response.setHeader('Vary', 'Origin')
        }
        response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, If-Match')
        response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
        if (request.method === 'OPTIONS') {
            response.sendStatus(HTTP_STATUS.noContent)
            return
        }
        next()
    }
