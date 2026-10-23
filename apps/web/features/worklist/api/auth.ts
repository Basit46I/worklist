import { z } from 'zod'
import { apiBaseUrl, request } from './client'
import type { WorklistAuthInput, WorklistLoginInput, WorklistReadiness, WorklistTeamMember, WorklistUser } from './types'

const worklistReadinessSchema = z
    .object({
        status: z.enum(['ready', 'not_ready']),
        dependencies: z.object({ database: z.enum(['available', 'unavailable']) }).strict()
    })
    .strict()

export const getWorklistReadiness = async (): Promise<WorklistReadiness> => {
    const response = await fetch(`${apiBaseUrl}/ready`, { cache: 'no-store' })
    const parsed = worklistReadinessSchema.safeParse(await response.json())
    if (!parsed.success) {
        throw new Error('The API returned an invalid readiness response.')
    }
    const readiness = parsed.data
    if (response.status === 503 && readiness.status === 'not_ready') return readiness
    if (!response.ok || readiness.status !== 'ready') throw new Error('The API is not ready.')
    return readiness
}

export const getCurrentUser = async (): Promise<WorklistUser | null> => {
    const response = await fetch(`${apiBaseUrl}/auth/session`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
    })
    if (response.status === 401) return null
    if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null
        throw new Error(body?.error?.message ?? `Request failed (${response.status}).`)
    }
    return ((await response.json()) as { user: WorklistUser }).user
}
export const registerUser = (input: WorklistAuthInput): Promise<Readonly<{ verificationRequired: true }>> =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(input) })
export const loginUser = async (input: WorklistLoginInput): Promise<WorklistUser> =>
    (await request<{ user: WorklistUser }>('/auth/login', { method: 'POST', body: JSON.stringify(input) })).user
export const logoutUser = (): Promise<void> => request<void>('/auth/logout', { method: 'POST' })
export const requestEmailVerification = (email: string): Promise<Readonly<{ message: string }>> =>
    request('/auth/verification/request', { method: 'POST', body: JSON.stringify({ email }) })
export const confirmEmailVerification = (token: string): Promise<Readonly<{ verified: true }>> =>
    request('/auth/verification/confirm', { method: 'POST', body: JSON.stringify({ token }) })
export const requestPasswordReset = (email: string): Promise<Readonly<{ message: string }>> =>
    request('/auth/password/forgot', { method: 'POST', body: JSON.stringify({ email }) })
export const resetPassword = (token: string, password: string): Promise<Readonly<{ reset: true }>> =>
    request('/auth/password/reset', { method: 'POST', body: JSON.stringify({ token, password }) })
export const inviteTeamMember = (email: string, role: 'editor' | 'viewer'): Promise<Readonly<{ invited: true }>> =>
    request('/auth/invitations', { method: 'POST', body: JSON.stringify({ email, role }) })
export const fetchTeamMembers = async (): Promise<readonly WorklistTeamMember[]> =>
    (await request<{ members: readonly WorklistTeamMember[] }>('/auth/team/members')).members
export const updateTeamMemberRole = (memberId: string, role: 'editor' | 'viewer'): Promise<Readonly<{ updated: true }>> =>
    request(`/auth/team/members/${encodeURIComponent(memberId)}`, { method: 'PATCH', body: JSON.stringify({ role }) })
export const removeTeamMember = (memberId: string): Promise<void> =>
    request<void>(`/auth/team/members/${encodeURIComponent(memberId)}`, { method: 'DELETE' })
export const acceptTeamInvitation = async (token: string, name: string, password: string): Promise<WorklistUser> =>
    (await request<{ user: WorklistUser }>('/auth/invitations/accept', { method: 'POST', body: JSON.stringify({ token, name, password }) })).user
