import { z } from 'zod'
import type { AuthIdentity, AuthRepository, AuthService } from '../auth/public.js'
import { renderWorklistEmail, type EmailSender } from '../../integrations/index.js'
import { createApplicationError } from '../../errors/index.js'
import { ERROR_CODES, HTTP_STATUS } from '../../constants/index.js'

type Assignment = Readonly<{ assignee: string; assigneeEmail: string; assigneePending: boolean }>
type AssignedItem = Readonly<{ id: string; title: string; dueDate: string; priority: string; listId?: string }>
type Dependencies = Readonly<{
    accounts: Pick<AuthRepository, 'findUserByEmail' | 'listTeamMembers'>
    invitations: Pick<AuthService, 'inviteMember'>
    emailSender?: EmailSender
    webOrigin: string
}>

export const createWorkItemAssignmentService = ({ accounts, invitations, emailSender, webOrigin }: Dependencies) => Object.freeze({
    resolve: async (actor: AuthIdentity, value: string): Promise<Assignment> => {
        const email = value.trim().toLowerCase()
        if (!email || email === 'unassigned') return { assignee: 'Unassigned', assigneeEmail: '', assigneePending: false }
        if (!z.email().safeParse(email).success)
            throw createApplicationError({ code: ERROR_CODES.validation, message: 'Enter a valid assignee email address, or leave it blank.', status: HTTP_STATUS.badRequest })
        const user = await accounts.findUserByEmail(email)
        if (user && user.teamId !== actor.teamId)
            throw createApplicationError({ code: ERROR_CODES.conflict, message: 'This email belongs to another workspace. Use an existing team member or invite a new email address.', status: HTTP_STATUS.conflict })
        if (!user && actor.role !== 'owner')
            throw createApplicationError({ code: ERROR_CODES.forbidden, message: 'Ask the workspace owner to invite this email first.', status: HTTP_STATUS.forbidden })
        if (!emailSender)
            throw createApplicationError({ code: ERROR_CODES.unavailable, message: 'Email delivery is not configured. Configure SMTP before assigning tasks by email.', status: HTTP_STATUS.serviceUnavailable })
        return { assignee: user?.name ?? email, assigneeEmail: email, assigneePending: !user }
    },
    notify: async (actor: AuthIdentity, assignment: Assignment, item: AssignedItem): Promise<string> => {
        if (!assignment.assigneeEmail) return 'Task saved without an assignee.'
        try {
            if (assignment.assigneePending) {
                await invitations.inviteMember(actor, assignment.assigneeEmail, 'editor', item.title)
                return `Task saved. Invitation sent to ${assignment.assigneeEmail}.`
            }
            if (!emailSender) throw new Error('Email delivery is not configured.')
            const url = new URL('/worklist', webOrigin)
            if (item.listId) url.searchParams.set('listId', item.listId)
            await emailSender.send({
                to: assignment.assigneeEmail,
                subject: `Assigned to you: ${item.title}`,
                text: `Hi ${assignment.assignee},\n\n${actor.name} assigned “${item.title}” to you in ${actor.teamName}.\nDue: ${item.dueDate}\nPriority: ${item.priority}\n\nOpen Worklist: ${url.toString()}`,
                html: renderWorklistEmail({ title: 'Your next task is here.', description: `${actor.name} assigned a task to you in ${actor.teamName}.`, eyebrow: 'ASSIGNED TO YOU', actionLabel: 'View your task', actionUrl: url.toString(), details: [{ label: 'Task', value: item.title }, { label: 'Assigned to', value: assignment.assignee }, { label: 'Due date', value: item.dueDate }, { label: 'Priority', value: item.priority }] })
            })
            return `Task saved. Assignment email sent to ${assignment.assigneeEmail}.`
        } catch {
            // Persistence has already succeeded. Never report a failed save or encourage duplicate task creation.
            return `Task saved, but the email to ${assignment.assigneeEmail} could not be sent. Re-enter this email to retry.`
        }
    },
    hydrate: async <T extends Readonly<{ assignee: string; assigneeEmail?: string }>>(teamId: string, items: readonly T[]): Promise<readonly (T & Readonly<{ assigneePending: boolean }>)[]> => {
        if (items.every((item) => !item.assigneeEmail && item.assignee === 'Unassigned')) return items.map((item) => ({ ...item, assigneePending: false }))
        const members = await accounts.listTeamMembers(teamId)
        const names = new Map(members.map((member) => [member.email.toLowerCase(), member.name]))
        return items.map((item) => {
            const legacyMatches = item.assigneeEmail ? [] : members.filter((member) => member.name === item.assignee)
            const email = item.assigneeEmail || (legacyMatches.length === 1 ? legacyMatches[0]?.email.toLowerCase() : '') || ''
            return { ...item, assigneeEmail: email, assignee: email ? names.get(email) ?? email : item.assignee, assigneePending: Boolean(email && !names.has(email)) }
        })
    }
})
