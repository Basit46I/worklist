import { z } from 'zod'

export const registerSchema = z
    .object({
        name: z.string().trim().min(1).max(80),
        email: z.email().trim().toLowerCase().max(254),
        password: z.string().min(12).max(128),
        teamName: z.string().trim().min(2).max(80)
    })
    .strict()

export const loginSchema = z
    .object({
        email: z.email().trim().toLowerCase().max(254),
        password: z.string().min(1).max(128)
    })
    .strict()

export const emailOnlySchema = z.object({ email: z.email().trim().toLowerCase().max(254) }).strict()
export const tokenOnlySchema = z.object({ token: z.string().min(32).max(128) }).strict()
export const resetPasswordSchema = tokenOnlySchema.extend({ password: z.string().min(12).max(128) }).strict()
export const invitationSchema = z.object({ email: z.email().trim().toLowerCase().max(254), role: z.enum(['editor', 'viewer']) }).strict()
export const acceptInvitationSchema = tokenOnlySchema
    .extend({ name: z.string().trim().min(1).max(80), password: z.string().min(12).max(128) })
    .strict()
export const memberParamsSchema = z.object({ memberId: z.string().regex(/^[a-f\d]{24}$/i) }).strict()
export const memberRoleSchema = z.object({ role: z.enum(['editor', 'viewer']) }).strict()

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
