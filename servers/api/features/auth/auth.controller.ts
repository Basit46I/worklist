import type { Request, RequestHandler } from 'express'
import { createApplicationError } from '../../errors/index.js'
import { ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS } from '../../constants/index.js'
import { digestSessionToken } from './auth.credentials.js'
import {
    acceptInvitationSchema,
    emailOnlySchema,
    invitationSchema,
    loginSchema,
    memberParamsSchema,
    memberRoleSchema,
    registerSchema,
    resetPasswordSchema,
    tokenOnlySchema
} from './auth.validation.js'
import type { AuthService } from './auth.types.js'
import type { AuthIdentity } from './auth.types.js'

const cookieName = 'worklist_session'
type RequestWithIdentity = Request & { authIdentity?: AuthIdentity }
const maxSessionAgeSeconds = 7 * 24 * 60 * 60

const originGuard =
    (origins: readonly string[]): RequestHandler =>
    (request, _response, next) => {
        if (!origins.includes(request.get('origin') ?? '')) {
            next(
                createApplicationError({
                    code: ERROR_CODES.forbidden,
                    message: ERROR_MESSAGES.forbidden,
                    status: HTTP_STATUS.forbidden
                })
            )
            return
        }
        next()
    }
export const createOriginGuard = originGuard

export const createAuthRateLimitHandler = (): RequestHandler => (_request, response) => {
    response.status(HTTP_STATUS.tooManyRequests).json({
        error: { code: ERROR_CODES.rateLimited, message: ERROR_MESSAGES.rateLimited }
    })
}

const readSessionToken = (request: Request): string | null => {
    const cookieHeader = request.headers.cookie
    if (!cookieHeader) return null
    const cookie = cookieHeader
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${cookieName}=`))
    return cookie ? cookie.slice(cookieName.length + 1) || null : null
}

const sessionCookie = (token: string, secure: boolean): string =>
    [`${cookieName}=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${String(maxSessionAgeSeconds)}`, ...(secure ? ['Secure'] : [])].join(
        '; '
    )

const clearSessionCookie = (secure: boolean): string =>
    [`${cookieName}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0', ...(secure ? ['Secure'] : [])].join('; ')

export const createAuthController = ({
    service,
    webOrigins,
    secureCookies
}: Readonly<{ service: AuthService; webOrigins: readonly string[]; secureCookies: boolean }>): Readonly<{
    routes: Readonly<{
        register: RequestHandler
        login: RequestHandler
        logout: RequestHandler
        currentSession: RequestHandler
        requestVerification: RequestHandler
        verifyEmail: RequestHandler
        requestPasswordReset: RequestHandler
        resetPassword: RequestHandler
        inviteMember: RequestHandler
        acceptInvitation: RequestHandler
        listTeamMembers: RequestHandler
        updateTeamMember: RequestHandler
        removeTeamMember: RequestHandler
    }>
    verifyOrigin: RequestHandler
}> => ({
    verifyOrigin: originGuard(webOrigins),
    routes: Object.freeze({
        register: async (request, response) => {
            const input = registerSchema.parse(request.body)
            const result = await service.register(input)
            response.setHeader('Cache-Control', 'no-store')
            response.status(HTTP_STATUS.created).json(result)
        },
        login: async (request, response) => {
            const input = loginSchema.parse(request.body)
            const session = await service.login(input)
            response.setHeader('Cache-Control', 'no-store')
            response.setHeader('Set-Cookie', sessionCookie(session.token, secureCookies))
            response.status(HTTP_STATUS.ok).json({ user: session.identity })
        },
        logout: async (request, response) => {
            await service.logout(readSessionToken(request))
            response.setHeader('Cache-Control', 'no-store')
            response.setHeader('Set-Cookie', clearSessionCookie(secureCookies))
            response.status(HTTP_STATUS.noContent).end()
        },
        currentSession: async (request, response) => {
            const identity = await service.getSession(readSessionToken(request))
            response.setHeader('Cache-Control', 'no-store')
            if (!identity) {
                response.status(HTTP_STATUS.unauthorized).json({
                    error: { code: ERROR_CODES.unauthenticated, message: ERROR_MESSAGES.unauthenticated }
                })
                return
            }
            response.status(HTTP_STATUS.ok).json({ user: identity })
        },
        requestVerification: async (request, response) => {
            const { email } = emailOnlySchema.parse(request.body)
            await service.requestEmailVerification(email)
            response.setHeader('Cache-Control', 'no-store')
            response.status(HTTP_STATUS.accepted).json({ message: 'If the account needs verification, an email has been sent.' })
        },
        verifyEmail: async (request, response) => {
            const { token } = tokenOnlySchema.parse(request.body)
            await service.verifyEmail(token)
            response.status(HTTP_STATUS.ok).json({ verified: true })
        },
        requestPasswordReset: async (request, response) => {
            const { email } = emailOnlySchema.parse(request.body)
            await service.requestPasswordReset(email)
            response.setHeader('Cache-Control', 'no-store')
            response.status(HTTP_STATUS.accepted).json({ message: 'If the account exists, a password reset email has been sent.' })
        },
        resetPassword: async (request, response) => {
            const { token, password } = resetPasswordSchema.parse(request.body)
            await service.resetPassword(token, password)
            response.status(HTTP_STATUS.ok).json({ reset: true })
        },
        inviteMember: async (request, response) => {
            const { email, role } = invitationSchema.parse(request.body)
            const identity = (request as RequestWithIdentity).authIdentity
            if (!identity)
                throw createApplicationError({
                    code: ERROR_CODES.unauthenticated,
                    message: ERROR_MESSAGES.unauthenticated,
                    status: HTTP_STATUS.unauthorized
                })
            await service.inviteMember(identity, email, role)
            response.status(HTTP_STATUS.created).json({ invited: true })
        },
        acceptInvitation: async (request, response) => {
            const input = acceptInvitationSchema.parse(request.body)
            const session = await service.acceptInvitation(input)
            response.setHeader('Cache-Control', 'no-store')
            response.setHeader('Set-Cookie', sessionCookie(session.token, secureCookies))
            response.status(HTTP_STATUS.ok).json({ user: session.identity })
        },
        listTeamMembers: async (request, response) => {
            const identity = (request as RequestWithIdentity).authIdentity
            if (!identity)
                throw createApplicationError({
                    code: ERROR_CODES.unauthenticated,
                    message: ERROR_MESSAGES.unauthenticated,
                    status: HTTP_STATUS.unauthorized
                })
            response.setHeader('Cache-Control', 'no-store')
            response.status(HTTP_STATUS.ok).json({ members: await service.listTeamMembers(identity) })
        },
        updateTeamMember: async (request, response) => {
            const { memberId } = memberParamsSchema.parse(request.params)
            const { role } = memberRoleSchema.parse(request.body)
            const identity = (request as RequestWithIdentity).authIdentity
            if (!identity)
                throw createApplicationError({
                    code: ERROR_CODES.unauthenticated,
                    message: ERROR_MESSAGES.unauthenticated,
                    status: HTTP_STATUS.unauthorized
                })
            await service.updateTeamMemberRole(identity, memberId, role)
            response.status(HTTP_STATUS.ok).json({ updated: true })
        },
        removeTeamMember: async (request, response) => {
            const { memberId } = memberParamsSchema.parse(request.params)
            const identity = (request as RequestWithIdentity).authIdentity
            if (!identity)
                throw createApplicationError({
                    code: ERROR_CODES.unauthenticated,
                    message: ERROR_MESSAGES.unauthenticated,
                    status: HTTP_STATUS.unauthorized
                })
            await service.removeTeamMember(identity, memberId)
            response.status(HTTP_STATUS.noContent).end()
        }
    })
})

export const createAuthGuard =
    ({ service }: Readonly<{ service: AuthService }>): RequestHandler =>
    async (request, _response, next) => {
        const identity = await service.getSession(readSessionToken(request))
        if (!identity) {
            next(
                createApplicationError({
                    code: ERROR_CODES.unauthenticated,
                    message: ERROR_MESSAGES.unauthenticated,
                    status: HTTP_STATUS.unauthorized
                })
            )
            return
        }
        ;(request as RequestWithIdentity).authIdentity = identity
        next()
    }

export const getSessionTokenDigest = (request: Request): string | null => {
    const token = readSessionToken(request)
    return token ? digestSessionToken(token) : null
}
