import { Router } from 'express'
import type { Store } from 'express-rate-limit'
import { createAuthController, createAuthGuard } from '../auth.controller.js'
import { createAuthRepository } from '../auth.repository.js'
import { createAuthService } from '../auth.service.js'
import { createDefaultAuthRateLimits } from '../auth-rate-limits.js'
import type { EmailSender } from '../../../integrations/index.js'

export type AuthRouteDependencies = Readonly<{
    webOrigins: readonly string[]
    secureCookies: boolean
    isPersistenceAvailable: () => boolean
    rateLimitStoreFactory?: (scope: string) => Store
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

    const authRateLimits = createDefaultAuthRateLimits(dependencies.rateLimitStoreFactory)
    const authGuard = createAuthGuard({ service })

    router.post('/auth/register', controller.verifyOrigin, authRateLimits.register, controller.routes.register)
    router.post('/auth/login', controller.verifyOrigin, authRateLimits.login, controller.routes.login)
    router.post('/auth/logout', controller.verifyOrigin, controller.routes.logout)
    router.get('/auth/session', controller.routes.currentSession)
    router.post('/auth/verification/request', controller.verifyOrigin, authRateLimits.email, controller.routes.requestVerification)
    router.post('/auth/verification/confirm', controller.verifyOrigin, controller.routes.verifyEmail)
    router.post('/auth/password/forgot', controller.verifyOrigin, authRateLimits.email, controller.routes.requestPasswordReset)
    router.post('/auth/password/reset', controller.verifyOrigin, controller.routes.resetPassword)
    router.post('/auth/invitations', controller.verifyOrigin, authGuard, authRateLimits.email, controller.routes.inviteMember)
    router.post('/auth/invitations/accept', controller.verifyOrigin, controller.routes.acceptInvitation)
    router.get('/auth/team/members', authGuard, controller.routes.listTeamMembers)
    router.patch('/auth/team/members/:memberId', controller.verifyOrigin, authGuard, controller.routes.updateTeamMember)
    router.delete('/auth/team/members/:memberId', controller.verifyOrigin, authGuard, controller.routes.removeTeamMember)
    return router
}
