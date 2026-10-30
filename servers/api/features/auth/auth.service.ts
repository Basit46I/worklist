import { createApplicationError } from '../../errors/index.js'
import { ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS } from '../../constants/index.js'
import { createSessionToken, digestSessionToken, hashPassword, verifyPassword } from './auth.credentials.js'
import type { AuthIdentity, AuthRepository, AuthService } from './auth.types.js'
import type { AuthTeamMember } from './auth.types.js'
import { renderWorklistEmail, type EmailSender } from '../../integrations/index.js'

const sessionLifetimeMs = 7 * 24 * 60 * 60 * 1000

const unavailableError = () =>
    createApplicationError({
        code: ERROR_CODES.unavailable,
        message: ERROR_MESSAGES.unavailable,
        status: HTTP_STATUS.serviceUnavailable
    })

const emailUnavailableError = () =>
    createApplicationError({
        code: ERROR_CODES.unavailable,
        message: 'Email delivery is not configured. Add all SMTP settings to servers/api/.env and restart the API.',
        status: HTTP_STATUS.serviceUnavailable
    })

const conflictError = () =>
    createApplicationError({
        code: ERROR_CODES.conflict,
        message: ERROR_MESSAGES.conflict,
        status: HTTP_STATUS.conflict
    })

const unauthenticatedError = () =>
    createApplicationError({
        code: ERROR_CODES.unauthenticated,
        message: ERROR_MESSAGES.unauthenticated,
        status: HTTP_STATUS.unauthorized
    })

const invalidTokenError = () =>
    createApplicationError({
        code: ERROR_CODES.validation,
        message: 'This link is invalid, expired, or has already been used.',
        status: HTTP_STATUS.badRequest
    })

const isDuplicateKeyError = (error: unknown): boolean => typeof error === 'object' && error !== null && 'code' in error && error.code === 11000

export const createAuthService = ({
    repository,
    isPersistenceAvailable,
    emailSender,
    webOrigin,
    now = () => new Date()
}: Readonly<{
    repository: AuthRepository
    isPersistenceAvailable: () => boolean
    emailSender?: EmailSender
    webOrigin?: string
    now?: () => Date
}>): AuthService => {
    const createSession = async (identity: AuthIdentity) => {
        const token = createSessionToken()
        const expiresAt = new Date(now().getTime() + sessionLifetimeMs)
        await repository.createSession({ userId: identity.id, tokenDigest: digestSessionToken(token), expiresAt })
        return Object.freeze({ identity, token, expiresAt })
    }

    const createActionLink = async (
        input: Readonly<{
            email: string
            kind: 'email-verification' | 'password-reset' | 'team-invitation'
            path: string
            subject: string
            description: string
            teamId?: string
            role?: 'editor' | 'viewer'
        }>
    ): Promise<void> => {
        if (!emailSender) throw emailUnavailableError()
        const token = createSessionToken()
        await repository.createActionToken({
            tokenDigest: digestSessionToken(token),
            kind: input.kind,
            email: input.email,
            expiresAt: new Date(now().getTime() + (input.kind === 'team-invitation' ? 7 : 1) * 24 * 60 * 60 * 1000),
            ...(input.teamId ? { teamId: input.teamId } : {}),
            ...(input.role ? { role: input.role } : {})
        })
        const link = new URL(input.path, webOrigin ?? 'http://localhost:3000')
        link.searchParams.set('token', token)
        await emailSender.send({
            to: input.email,
            subject: input.subject,
            text: `${input.description}\n\nOpen this link to continue: ${link.toString()}\n\nIf you did not request this, ignore this email.`,
            html: renderWorklistEmail({ title: input.kind === 'team-invitation' ? 'Great work starts together.' : input.kind === 'password-reset' ? 'A fresh start for your password.' : 'Welcome to Worklist.', description: input.description, actionLabel: input.kind === 'team-invitation' ? 'Accept invitation' : input.kind === 'password-reset' ? 'Reset password' : 'Verify email', actionUrl: link.toString(), eyebrow: input.kind === 'team-invitation' ? 'YOU’RE INVITED' : 'YOUR ACCOUNT', footer: `This link expires in ${input.kind === 'team-invitation' ? '7 days' : '24 hours'}. If you did not expect this email, you can safely ignore it.` })
        })
    }

    return Object.freeze({
        register: async ({ name, email, password, teamName }) => {
            if (!isPersistenceAvailable()) throw unavailableError()
            if (!emailSender) throw emailUnavailableError()
            if (await repository.findUserByEmail(email)) throw conflictError()
            const passwordHash = await hashPassword(password)
            try {
                await repository.createAccount({ name, email, passwordHash, teamName })
                await createActionLink({
                    email,
                    kind: 'email-verification',
                    path: '/verify-email',
                    subject: 'Verify your Worklist email',
                    description: 'Verify your email address to activate your Worklist account.'
                })
                return Object.freeze({ verificationRequired: true as const })
            } catch (error) {
                if (isDuplicateKeyError(error)) throw conflictError()
                if (error instanceof Error) throw error
                throw new Error('Account registration failed.', { cause: error })
            }
        },
        login: async ({ email, password }) => {
            if (!isPersistenceAvailable()) throw unavailableError()
            const user = await repository.findUserByEmail(email)
            const validPassword = user ? await verifyPassword(password, user.passwordHash) : false
            if (!user || !validPassword) throw unauthenticatedError()
            if (!user.emailVerified)
                throw createApplicationError({
                    code: ERROR_CODES.forbidden,
                    message: 'Verify your email address before signing in. You can request another verification email.',
                    status: HTTP_STATUS.forbidden
                })
            return createSession({ id: user.id, name: user.name, email: user.email, teamId: user.teamId, teamName: user.teamName, role: user.role })
        },
        getSession: async (token) => {
            if (!token || !isPersistenceAvailable()) return null
            return repository.findSessionIdentity(digestSessionToken(token), now())
        },
        logout: async (token) => {
            if (token && isPersistenceAvailable()) await repository.deleteSession(digestSessionToken(token))
        },
        requestPasswordReset: async (email) => {
            if (!isPersistenceAvailable()) throw unavailableError()
            if (!emailSender) throw emailUnavailableError()
            const user = await repository.findUserByEmail(email)
            if (user?.emailVerified)
                await createActionLink({
                    email,
                    kind: 'password-reset',
                    path: '/reset-password',
                    subject: 'Reset your Worklist password',
                    description: 'Use this one-time link to choose a new password.'
                })
        },
        resetPassword: async (token, password) => {
            if (!isPersistenceAvailable()) throw unavailableError()
            const email = await repository.consumeActionToken(digestSessionToken(token), 'password-reset', now())
            if (!email || !(await repository.updatePassword(email, await hashPassword(password)))) throw invalidTokenError()
        },
        verifyEmail: async (token) => {
            if (!isPersistenceAvailable()) throw unavailableError()
            const email = await repository.consumeActionToken(digestSessionToken(token), 'email-verification', now())
            if (!email || !(await repository.markEmailVerified(email))) throw invalidTokenError()
        },
        requestEmailVerification: async (email) => {
            if (!isPersistenceAvailable()) throw unavailableError()
            if (!emailSender) throw emailUnavailableError()
            const user = await repository.findUserByEmail(email)
            if (user && !user.emailVerified)
                await createActionLink({
                    email,
                    kind: 'email-verification',
                    path: '/verify-email',
                    subject: 'Verify your Worklist email',
                    description: 'Verify your email address to activate your Worklist account.'
                })
        },
        inviteMember: async (owner, email, role, taskTitle) => {
            if (!isPersistenceAvailable()) throw unavailableError()
            if (owner.role !== 'owner')
                throw createApplicationError({ code: ERROR_CODES.forbidden, message: ERROR_MESSAGES.forbidden, status: HTTP_STATUS.forbidden })
            const existingUser = await repository.findUserByEmail(email)
            if (existingUser) {
                throw createApplicationError({
                    code: ERROR_CODES.conflict,
                    message:
                        existingUser.teamId === owner.teamId
                            ? 'This person is already a member of your workspace.'
                            : 'This email already belongs to another Worklist workspace. Each account can currently belong to one workspace, so invite an email that is not already registered.',
                    status: HTTP_STATUS.conflict
                })
            }
            await createActionLink({
                email,
                kind: 'team-invitation',
                path: '/accept-invitation',
                subject: `Invitation to join ${owner.teamName}`,
                description: `You have been invited to join ${owner.teamName} as a ${role}.${taskTitle ? ` A task is waiting for you: “${taskTitle}”.` : ''}`,
                teamId: owner.teamId,
                role
            })
        },
        acceptInvitation: async ({ token, name, password }) => {
            if (!isPersistenceAvailable()) throw unavailableError()
            const identity = await repository.acceptInvitation({
                tokenDigest: digestSessionToken(token),
                name,
                passwordHash: await hashPassword(password),
                now: now()
            })
            if (!identity) throw invalidTokenError()
            return createSession(identity)
        },
        listTeamMembers: async (actor): Promise<readonly AuthTeamMember[]> => {
            if (!isPersistenceAvailable()) throw unavailableError()
            if (actor.role !== 'owner')
                throw createApplicationError({ code: ERROR_CODES.forbidden, message: ERROR_MESSAGES.forbidden, status: HTTP_STATUS.forbidden })
            return repository.listTeamMembers(actor.teamId)
        },
        updateTeamMemberRole: async (actor, memberId, role) => {
            if (!isPersistenceAvailable()) throw unavailableError()
            if (actor.role !== 'owner')
                throw createApplicationError({ code: ERROR_CODES.forbidden, message: ERROR_MESSAGES.forbidden, status: HTTP_STATUS.forbidden })
            if (!(await repository.updateTeamMemberRole(actor.teamId, memberId, role)))
                throw createApplicationError({
                    code: ERROR_CODES.routeNotFound,
                    message: 'That team member could not be found or cannot be changed.',
                    status: HTTP_STATUS.notFound
                })
        },
        removeTeamMember: async (actor, memberId) => {
            if (!isPersistenceAvailable()) throw unavailableError()
            if (actor.role !== 'owner')
                throw createApplicationError({ code: ERROR_CODES.forbidden, message: ERROR_MESSAGES.forbidden, status: HTTP_STATUS.forbidden })
            if (!(await repository.removeTeamMember(actor.teamId, memberId)))
                throw createApplicationError({
                    code: ERROR_CODES.routeNotFound,
                    message: 'That team member could not be found or cannot be removed.',
                    status: HTTP_STATUS.notFound
                })
        }
    })
}
