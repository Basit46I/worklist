import type { Request, Response } from 'express'
import { createApplicationError } from '../../../errors/index.js'
import { ERROR_CODES, HTTP_STATUS } from '../../../constants/index.js'
import type { createWorkItemRepository } from '../work-item.repository.js'
import type { createWorklistListRepository } from '../worklist-list.repository.js'
import type { createWorklistTemplateRepository } from '../worklist-template.repository.js'
import { createWorklistListSchema, updateWorklistListSchema, worklistListsQuerySchema } from '../worklist-list.validation.js'
import { saveWorklistTemplateSchema } from '../worklist-template.validation.js'
import type { WorkItemController } from './work-item.controller.types.js'
import {
    duplicateListName,
    duplicateTemplateName,
    getListId,
    getTemplateId,
    isDuplicateKeyError,
    missingItem,
    nonEmptyList,
    requireIdentity,
    requireItemEditor
} from './work-item.controller-support.js'

type WorklistStructureHandlers = Pick<
    WorkItemController,
    | 'handleGetTemplates'
    | 'handlePostTemplates'
    | 'handlePatchTemplatesTemplateId'
    | 'handleDeleteTemplatesTemplateId'
    | 'handleGetLists'
    | 'handlePostLists'
    | 'handlePostListsListIdDuplicate'
    | 'handlePatchListsListId'
    | 'handlePostListsListIdArchive'
    | 'handlePostListsListIdRestore'
    | 'handleDeleteListsListId'
>

export const createWorklistStructureController = (
    repository: ReturnType<typeof createWorkItemRepository>,
    lists: ReturnType<typeof createWorklistListRepository>,
    templates: ReturnType<typeof createWorklistTemplateRepository>
): WorklistStructureHandlers =>
    Object.freeze({
        handleGetTemplates: async (request: Request, response: Response) => {
            const identity = requireIdentity(request)
            response.setHeader('Cache-Control', 'no-store')
            response.json({ templates: await templates.list(identity.teamId) })
        },
        handlePostTemplates: async (request: Request, response: Response) => {
            const input = saveWorklistTemplateSchema.parse(request.body)
            const identity = requireItemEditor(request)
            try {
                response.status(HTTP_STATUS.created).json({ template: await templates.create(identity.teamId, identity.id, input) })
            } catch (error) {
                if (isDuplicateKeyError(error)) throw duplicateTemplateName()
                throw error
            }
        },
        handlePatchTemplatesTemplateId: async (request: Request, response: Response) => {
            const input = saveWorklistTemplateSchema.parse(request.body)
            const identity = requireItemEditor(request)
            try {
                const template = await templates.update(identity.teamId, getTemplateId(request), input)
                if (!template) throw missingItem()
                response.json({ template })
            } catch (error) {
                if (isDuplicateKeyError(error)) throw duplicateTemplateName()
                throw error
            }
        },
        handleDeleteTemplatesTemplateId: async (request: Request, response: Response) => {
            const identity = requireItemEditor(request)
            if (!(await templates.delete(identity.teamId, getTemplateId(request)))) throw missingItem()
            response.status(HTTP_STATUS.noContent).end()
        },
        handleGetLists: async (request: Request, response: Response) => {
            const identity = requireIdentity(request)
            await lists.ensureDefault(identity.teamId, identity.id)
            const { includeArchived } = worklistListsQuerySchema.parse(request.query)
            response.setHeader('Cache-Control', 'no-store')
            response.json({ lists: await lists.list(identity.teamId, includeArchived === 'true') })
        },
        handlePostLists: async (request: Request, response: Response) => {
            const input = createWorklistListSchema.parse(request.body)
            const identity = requireItemEditor(request)
            try {
                response
                    .status(HTTP_STATUS.created)
                    .json({
                        list: await lists.create(
                            identity.teamId,
                            identity.id,
                            input.name,
                            input.description,
                            input.spaceName,
                            input.folderName,
                            input.statuses
                        )
                    })
            } catch (error) {
                if (isDuplicateKeyError(error)) throw duplicateListName()
                throw error
            }
        },
        handlePostListsListIdDuplicate: async (request: Request, response: Response) => {
            const { name } = createWorklistListSchema.parse(request.body)
            const identity = requireItemEditor(request)
            try {
                const list = await lists.duplicate(identity.teamId, identity.id, getListId(request), name)
                if (!list) throw missingItem()
                response.status(HTTP_STATUS.created).json({ list })
            } catch (error) {
                if (isDuplicateKeyError(error)) throw duplicateListName()
                throw error
            }
        },
        handlePatchListsListId: async (request: Request, response: Response) => {
            const changes = updateWorklistListSchema.parse(request.body)
            const identity = requireItemEditor(request)
            try {
                if (changes.settings) {
                    const usedStatuses = await repository.usedStatuses(identity.teamId, getListId(request))
                    if (usedStatuses.some((status) => !changes.settings?.statuses.includes(status)))
                        throw createApplicationError({
                            code: ERROR_CODES.conflict,
                            message: 'A status used by existing tasks cannot be removed. Move those tasks to another status first.',
                            status: HTTP_STATUS.conflict
                        })
                }
                const normalizedChanges = {
                    ...(changes.name !== undefined ? { name: changes.name } : {}),
                    ...(changes.description !== undefined ? { description: changes.description } : {}),
                    ...(changes.spaceName !== undefined ? { spaceName: changes.spaceName } : {}),
                    ...(changes.folderName !== undefined ? { folderName: changes.folderName } : {}),
                    ...(changes.settings !== undefined ? { settings: changes.settings } : {})
                }
                const list = await lists.update(identity.teamId, getListId(request), normalizedChanges)
                if (!list) throw missingItem()
                response.json({ list })
            } catch (error) {
                if (isDuplicateKeyError(error)) throw duplicateListName()
                throw error
            }
        },
        handlePostListsListIdArchive: async (request: Request, response: Response) => {
            const identity = requireItemEditor(request)
            const list = await lists.setArchived(identity.teamId, getListId(request), true)
            if (!list) throw missingItem()
            response.json({ list })
        },
        handlePostListsListIdRestore: async (request: Request, response: Response) => {
            const identity = requireItemEditor(request)
            try {
                const list = await lists.setArchived(identity.teamId, getListId(request), false)
                if (!list) throw missingItem()
                response.json({ list })
            } catch (error) {
                if (isDuplicateKeyError(error)) throw duplicateListName()
                throw error
            }
        },
        handleDeleteListsListId: async (request: Request, response: Response) => {
            const identity = requireItemEditor(request)
            const result = await lists.deleteIfEmpty(identity.teamId, getListId(request))
            if (result === 'not_found') throw missingItem()
            if (result === 'not_empty') throw nonEmptyList()
            response.status(HTTP_STATUS.noContent).end()
        }
    })
