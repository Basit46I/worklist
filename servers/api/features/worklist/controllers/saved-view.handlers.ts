import type { Request, Response } from 'express'
import { HTTP_STATUS } from '../../../constants/index.js'
import { createSavedViewSchema } from '../saved-view.validation.js'
import { duplicateSavedViewName, isDuplicateKeyError, missingItem, requireIdentity } from './work-item.controller-support.js'
import type { WorkItemControllerContext } from './work-item.controller-context.js'

export const createSavedViewHandlers = ({ savedViews }: WorkItemControllerContext) => Object.freeze({
        handleGetSavedViews: async (request: Request, response: Response) => {
            const identity = requireIdentity(request)
            response.setHeader('Cache-Control', 'no-store')
            response.json({ views: await savedViews.list(identity.teamId, identity.id) })
        },
        handlePostSavedViews: async (request: Request, response: Response) => {
            const { name, state, visibility } = createSavedViewSchema.parse(request.body)
            const identity = requireIdentity(request)
            let view: Awaited<ReturnType<typeof savedViews.create>>
            try {
                view = await savedViews.create(identity.teamId, identity.id, name, state, visibility)
            } catch (error) {
                if (isDuplicateKeyError(error)) throw duplicateSavedViewName()
                throw error
            }
            response.status(HTTP_STATUS.created).json({ view })
        },
        handlePatchSavedViewsViewId: async (request: Request, response: Response) => {
            const { name, state, visibility } = createSavedViewSchema.parse(request.body)
            const identity = requireIdentity(request)
            const viewId = Array.isArray(request.params.viewId) ? (request.params.viewId[0] ?? '') : (request.params.viewId ?? '')
            let view: Awaited<ReturnType<typeof savedViews.update>>
            try {
                view = await savedViews.update(identity.teamId, identity.id, viewId, name, state, visibility)
            } catch (error) {
                if (isDuplicateKeyError(error)) throw duplicateSavedViewName()
                throw error
            }
            if (!view) throw missingItem()
            response.json({ view })
        },
        handleDeleteSavedViewsViewId: async (request: Request, response: Response) => {
            const identity = requireIdentity(request)
            const rawViewId = request.params.viewId
            const viewId = Array.isArray(rawViewId) ? (rawViewId[0] ?? '') : (rawViewId ?? '')
            if (!(await savedViews.delete(identity.teamId, identity.id, viewId))) throw missingItem()
            response.status(HTTP_STATUS.noContent).end()
        },
})
