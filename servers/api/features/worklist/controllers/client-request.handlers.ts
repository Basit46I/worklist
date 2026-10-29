import type { Request, RequestHandler, Response } from 'express'
import { createApplicationError } from '../../../errors/index.js'
import { ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS } from '../../../constants/index.js'
import { createWorkItemSchema } from '../work-item.validation.js'
import { publicClientRequestSchema } from '../client-request.validation.js'
import type { createWorklistListRepository } from '../worklist-list.repository.js'
import type { createWorkItemRepository } from '../work-item.repository.js'
import type { createWorkItemActivityRepository } from '../work-item-activity.repository.js'
import type { WorkItemEventHub } from '../work-item.events.js'
import { getListId, requireItemEditor } from './work-item.controller-support.js'

type Dependencies = Readonly<{
    lists: ReturnType<typeof createWorklistListRepository>
    items: ReturnType<typeof createWorkItemRepository>
    activities: ReturnType<typeof createWorkItemActivityRepository>
    events: WorkItemEventHub
    isPersistenceAvailable: () => boolean
}>

const missingForm = (): Error => createApplicationError({ code: ERROR_CODES.routeNotFound, message: 'This request form is unavailable.', status: HTTP_STATUS.notFound })
const getToken = (request: Request): string => Array.isArray(request.params.token) ? request.params.token[0] ?? '' : request.params.token ?? ''

export const createClientRequestHandlers = ({ lists, items, activities, events, isPersistenceAvailable }: Dependencies) => Object.freeze({
    handlePostListRequestForm: async (request: Request, response: Response): Promise<void> => {
        const identity = requireItemEditor(request)
        const result = await lists.createRequestForm(identity.teamId, getListId(request))
        if (!result) throw missingForm()
        response.status(HTTP_STATUS.created).json({ token: result.token, enabled: result.list.requestFormEnabled })
    },
    handleDeleteListRequestForm: async (request: Request, response: Response): Promise<void> => {
        const identity = requireItemEditor(request)
        if (!(await lists.revokeRequestForm(identity.teamId, getListId(request)))) throw missingForm()
        response.status(HTTP_STATUS.noContent).end()
    },
    handleGetClientRequestForm: async (request: Request, response: Response): Promise<void> => {
        if (!isPersistenceAvailable()) throw createApplicationError({ code: ERROR_CODES.unavailable, message: ERROR_MESSAGES.unavailable, status: HTTP_STATUS.serviceUnavailable })
        const list = await lists.findByRequestFormToken(getToken(request))
        if (!list) throw missingForm()
        response.setHeader('Cache-Control', 'no-store')
        response.json({ form: { listName: list.name, listDescription: list.description } })
    },
    handlePostClientRequestForm: async (request: Request, response: Response): Promise<void> => {
        if (!isPersistenceAvailable()) throw createApplicationError({ code: ERROR_CODES.unavailable, message: ERROR_MESSAGES.unavailable, status: HTTP_STATUS.serviceUnavailable })
        const input = publicClientRequestSchema.parse(request.body)
        if (input.website) {
            response.status(HTTP_STATUS.accepted).json({ submitted: true })
            return
        }
        const list = await lists.findByRequestFormToken(getToken(request))
        if (!list) throw missingForm()
        const itemInput = createWorkItemSchema.parse({
            listId: list.id,
            title: input.title,
            description: input.details,
            status: list.initialStatus,
            priority: 'Medium',
            assignee: 'Unassigned',
            dueDate: input.dueDate,
            clientRequest: { contactName: input.contactName, contactEmail: input.contactEmail, request: input.details }
        })
        const item = await items.create(list.teamId, list.createdBy, itemInput)
        await activities.add(list.teamId, item.id, list.createdBy, `Client request · ${input.contactName}`, 'created', 'Submitted a request through the public intake form.')
        events.publish(list.teamId, { type: 'activity', itemId: item.id })
        events.publish(list.teamId)
        response.status(HTTP_STATUS.created).json({ submitted: true })
    }
})

export type ClientRequestHandlers = Readonly<{
    handlePostListRequestForm: RequestHandler
    handleDeleteListRequestForm: RequestHandler
    handleGetClientRequestForm: RequestHandler
    handlePostClientRequestForm: RequestHandler
}>
