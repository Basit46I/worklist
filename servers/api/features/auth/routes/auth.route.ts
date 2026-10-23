import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { createAuthController, createAuthGuard, createAuthRateLimitHandler } from '../auth.controller.js'
import { createAuthRepository } from '../auth.repository.js'
import { createAuthService } from '../auth.service.js'
import type { EmailSender } from '../../../integrations/index.js'

export type AuthRouteDependencies = Readonly<{
    webOrigins: readonly string[]
    secureCookies: boolean
    isPersistenceAvailable: () => boolean
    emailSender?: EmailSender
}>

export const createAuthRoutes = (dependencies: AuthRouteDependencies): Router => {
    const router = Router()
    const service = createAuthService({
        repository: createAuthRepository(),
        isPersistenceAvailable: dependencies.isPersistenceAvailable,
        ...(dependencies.emailSender ? { emailSender: dependencies.emailSender } : {}),
        webOrigin: dependencies.webOrigins[0] ?? 'http://localhost:3000'
    })
    const controller = createAuthController({
        service,
        webOrigins: dependencies.webOrigins,
        secureCookies: dependencies.secureCookies
    })

    const registerRateLimit = rateLimit({
        windowMs: 60 * 60 * 1000,
        limit: 5,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        handler: createAuthRateLimitHandler()
    })
    const loginRateLimit = rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 10,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        handler: createAuthRateLimitHandler()
    })
    const emailRateLimit = rateLimit({
        windowMs: 60 * 60 * 1000,
        limit: 5,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        handler: createAuthRateLimitHandler()
    })
    const authGuard = createAuthGuard({ service })

    router.post('/auth/register', controller.verifyOrigin, registerRateLimit, controller.routes.register)
    router.post('/auth/login', controller.verifyOrigin, loginRateLimit, controller.routes.login)
    router.post('/auth/logout', controller.verifyOrigin, controller.routes.logout)
    router.get('/auth/session', controller.routes.currentSession)
    router.post('/auth/verification/request', controller.verifyOrigin, emailRateLimit, controller.routes.requestVerification)
    router.post('/auth/verification/confirm', controller.verifyOrigin, controller.routes.verifyEmail)
    router.post('/auth/password/forgot', controller.verifyOrigin, emailRateLimit, controller.routes.requestPasswordReset)
    router.post('/auth/password/reset', controller.verifyOrigin, controller.routes.resetPassword)
    router.post('/auth/invitations', controller.verifyOrigin, authGuard, emailRateLimit, controller.routes.inviteMember)
    router.post('/auth/invitations/accept', controller.verifyOrigin, controller.routes.acceptInvitation)
    router.get('/auth/team/members', authGuard, controller.routes.listTeamMembers)
    router.patch('/auth/team/members/:memberId', controller.verifyOrigin, authGuard, controller.routes.updateTeamMember)
    router.delete('/auth/team/members/:memberId', controller.verifyOrigin, authGuard, controller.routes.removeTeamMember)
    return router
}
