import type { Request, Response } from 'express'
import { HTTP_STATUS } from '../../../constants/index.js'
import type { WorkItemEvent } from '../work-item.events.js'
import { createWorkItemCommentSchema } from '../work-item-comment.validation.js'
import { getItemId, missingItem, requireIdentity, requireItemEditor } from './work-item.controller-support.js'
import type { WorkItemControllerContext } from './work-item.controller-context.js'

export const createWorkItemCommentHandlers = ({ repository, comments, activities, events }: WorkItemControllerContext) => Object.freeze({
        handleGetWorkItemsEvents: (request: Request, response: Response) => {
            const { teamId } = requireIdentity(request)
            response.setHeader('Cache-Control', 'no-cache, no-transform')
            response.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
            response.setHeader('Connection', 'keep-alive')
            response.setHeader('X-Accel-Buffering', 'no')
            response.flushHeaders()
            const sendRefresh = (event: WorkItemEvent): void => {
                const eventName = event.type === 'items' ? 'items-refresh' : event.type === 'comments' ? 'comments-refresh' : 'activity-refresh'
                const data = event.type !== 'items' && event.itemId ? { itemId: event.itemId } : {}
                response.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`)
            }
            const unsubscribe = events.subscribe(teamId, sendRefresh)
            const heartbeat = setInterval(() => {
                response.write(': keep-alive\n\n')
            }, 25_000)
            sendRefresh({ type: 'items' })
            response.on('close', () => {
                clearInterval(heartbeat)
                unsubscribe()
            })
        },
        handleGetWorkItemsItemIdComments: async (request: Request, response: Response) => {
            const identity = requireIdentity(request)
            const result = await comments.list(identity.teamId, getItemId(request))
            if (result === null) throw missingItem()
            response.setHeader('Cache-Control', 'no-store')
            response.json({ comments: result })
        },
        handleGetWorkItemsItemIdActivity: async (request: Request, response: Response) => {
            const identity = requireIdentity(request)
            const itemId = getItemId(request)
            if (!(await repository.find(identity.teamId, itemId))) throw missingItem()
            response.setHeader('Cache-Control', 'no-store')
            response.json({ activities: await activities.list(identity.teamId, itemId) })
        },
        handlePostWorkItemsItemIdComments: async (request: Request, response: Response) => {
            const input = createWorkItemCommentSchema.parse(request.body)
            const identity = requireItemEditor(request)
            const comment = await comments.create(identity.teamId, getItemId(request), identity.id, identity.name, input)
            if (!comment) throw missingItem()
            await activities.add(identity.teamId, getItemId(request), identity.id, identity.name, 'commented', 'Added a comment.')
            events.publish(identity.teamId, { type: 'comments', itemId: getItemId(request) })
            events.publish(identity.teamId, { type: 'activity', itemId: getItemId(request) })
            response.status(HTTP_STATUS.created).json({ comment })
        },
})
