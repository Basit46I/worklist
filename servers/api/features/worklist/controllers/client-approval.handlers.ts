import { randomBytes, timingSafeEqual } from 'node:crypto'
import type { Request, RequestHandler, Response } from 'express'
import type { EmailSender } from '../../../integrations/index.js'
import { ERROR_CODES, HTTP_STATUS } from '../../../constants/index.js'
import { createApplicationError } from '../../../errors/index.js'
import { clientApprovalDecisionSchema } from '../client-approval.validation.js'
import { createClientApprovalRepository } from '../client-approval.repository.js'
import { createWorkItemReminderRepository } from '../work-item-reminder.repository.js'
import type { createWorkItemActivityRepository } from '../work-item-activity.repository.js'
import type { WorkItemEventHub } from '../work-item.events.js'
import { getItemId, requireItemEditor } from './work-item.controller-support.js'

const getToken = (request: Request): string => Array.isArray(request.params.token) ? request.params.token[0] ?? '' : request.params.token ?? ''
const html = (value: string): string => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character)
const unavailable = (): Error => createApplicationError({ code: ERROR_CODES.unavailable, message: 'Email delivery is not configured for this workspace.', status: HTTP_STATUS.serviceUnavailable })
const invalidLink = (): Error => createApplicationError({ code: ERROR_CODES.routeNotFound, message: 'This approval link is invalid, expired, or already used.', status: HTTP_STATUS.notFound })

type Dependencies = Readonly<{ emailSender?: EmailSender; webOrigin: string; cronSecret?: string; activities: ReturnType<typeof createWorkItemActivityRepository>; events: WorkItemEventHub }>

export const createClientApprovalHandlers = ({ emailSender, webOrigin, cronSecret, activities, events }: Dependencies) => {
    const repository = createClientApprovalRepository()
    const reminders = createWorkItemReminderRepository()
    return Object.freeze({
        handlePostRequestApproval: async (request: Request, response: Response): Promise<void> => {
            const identity = requireItemEditor(request)
            if (!emailSender) throw unavailable()
            const token = randomBytes(32).toString('base64url')
            const item = await repository.request(identity.teamId, getItemId(request), token, new Date(Date.now() + 7 * 86_400_000))
            if (!item) throw invalidLink()
            const url = new URL(`/client-approval/${token}`, webOrigin).toString()
            try {
                await emailSender.send({ to: item.email, subject: `Approval requested: ${item.title}`, text: `${item.contactName},\n\nPlease review “${item.title}” and respond here: ${url}\n\nThis link expires in 7 days.`, html: `<p>${html(item.contactName)},</p><p>Please review <strong>${html(item.title)}</strong> and respond using the secure link below.</p><p><a href="${html(url)}">Review and respond</a></p><p>This link expires in 7 days.</p>` })
            } catch (error) {
                await repository.revoke(item.id, token)
                throw error
            }
            await activities.add(identity.teamId, item.id, identity.id, identity.name, 'approval_requested', `Sent an approval request to ${item.email}.`)
            events.publish(identity.teamId, { type: 'activity', itemId: item.id })
            events.publish(identity.teamId)
            response.status(HTTP_STATUS.created).json({ sent: true, expiresInDays: 7 })
        },
        handleGetClientApproval: async (request: Request, response: Response): Promise<void> => {
            const item = await repository.findByToken(getToken(request))
            if (!item) throw invalidLink()
            response.setHeader('Cache-Control', 'no-store')
            response.json({ item: { title: item.title, description: item.description, contactName: item.contactName } })
        },
        handlePostClientApproval: async (request: Request, response: Response): Promise<void> => {
            const input = clientApprovalDecisionSchema.parse(request.body)
            const item = await repository.decide(getToken(request), input.decision, input.feedback)
            if (!item) throw invalidLink()
            const action = input.decision
            const summary = action === 'approved' ? 'Client approved the deliverable.' : `Client requested changes: ${input.feedback}`
            await activities.add(item.teamId, item.id, item.actorId, `Client · ${item.contactName}`, action, summary)
            events.publish(item.teamId, { type: 'activity', itemId: item.id })
            events.publish(item.teamId)
            response.json({ submitted: true, decision: action })
        },
        handleGetScheduledReminders: async (request: Request, response: Response): Promise<void> => {
            const authorization = request.get('authorization') ?? ''
            const supplied = Buffer.from(authorization.replace(/^Bearer\s+/i, ''))
            const expected = Buffer.from(cronSecret ?? '')
            if (!cronSecret || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
                response.status(HTTP_STATUS.unauthorized).json({ error: { code: 'unauthenticated', message: 'A valid scheduler credential is required.' } })
                return
            }
            if (!emailSender) throw unavailable()
            const now = new Date()
            const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
            tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
            const dueDateKey = tomorrow.toISOString().slice(0, 10)
            const dueItems = await reminders.findDue(tomorrow, new Date(tomorrow.getTime() + 86_400_000))
            const pendingItems = await reminders.findPendingApprovals(new Date(now.getTime() - 3 * 86_400_000))
            let sent = 0
            let failed = 0
            for (const item of dueItems) {
                const id = String(item._id)
                if (!(await reminders.claimDue(id, dueDateKey))) continue
                try {
                    const recipient = await reminders.findAssigneeEmail(String(item.teamId), item.assignee) ?? item.clientRequest?.contactEmail
                    if (!recipient) { await reminders.finishDue(id, dueDateKey, false); continue }
                    await emailSender.send({ to: recipient, subject: `Due tomorrow: ${item.title}`, text: `Reminder: “${item.title}” is due on ${dueDateKey}.`, html: `<p>Reminder: <strong>${html(item.title)}</strong> is due on ${html(dueDateKey)}.</p>` })
                    await reminders.finishDue(id, dueDateKey, true)
                    sent += 1
                } catch {
                    await reminders.finishDue(id, dueDateKey, false)
                    failed += 1
                }
            }
            for (const item of pendingItems) {
                const id = String(item._id)
                if (!(await reminders.claimApproval(id))) continue
                try {
                    const token = randomBytes(32).toString('base64url')
                    const refreshed = await repository.request(String(item.teamId), id, token, new Date(Date.now() + 7 * 86_400_000))
                    if (!refreshed) throw new Error('Approval link could not be renewed.')
                    const url = new URL(`/client-approval/${token}`, webOrigin).toString()
                    await emailSender.send({ to: refreshed.email, subject: `Reminder: approval needed for ${refreshed.title}`, text: `Please review “${refreshed.title}” and respond here: ${url}`, html: `<p>A reminder that your review is needed for <strong>${html(refreshed.title)}</strong>.</p><p><a href="${html(url)}">Review and respond</a></p>` })
                    await reminders.finishApproval(id, true)
                    await activities.add(String(item.teamId), id, String(item.createdBy), 'Worklist reminders', 'approval_requested', `Sent an approval reminder to ${refreshed.email}.`)
                    events.publish(String(item.teamId), { type: 'activity', itemId: id })
                    sent += 1
                } catch {
                    await reminders.finishApproval(id, false)
                    failed += 1
                }
            }
            response.setHeader('Cache-Control', 'no-store')
            response.json({ sent, failed })
        }
    })
}

export type ClientApprovalHandlers = Readonly<{ handlePostRequestApproval: RequestHandler; handleGetClientApproval: RequestHandler; handlePostClientApproval: RequestHandler }>
