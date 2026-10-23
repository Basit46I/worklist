import type { Request, Response } from 'express'
import { createApplicationError } from '../../../errors/index.js'
import { ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS } from '../../../constants/index.js'
import { bulkDeleteWorkItemsSchema, bulkUpdateWorkItemsSchema, createWorkItemSchema, updateWorkItemSchema, workItemListQuerySchema } from '../work-item.validation.js'
import { getItemId, missingItem, requireIdentity, requireItemEditor } from './work-item.controller-support.js'
import type { WorkItemControllerContext } from './work-item.controller-context.js'

export const createWorkItemHandlers = ({ repository, lists, comments, activities, events }: WorkItemControllerContext) => Object.freeze({
        handleGetWorkItems: async (request: Request, response: Response) => {
            response.setHeader('Cache-Control', 'no-store')
            const parsedQuery = workItemListQuerySchema.parse(request.query)
            const identity = requireIdentity(request)
            const defaultList = await lists.ensureDefault(identity.teamId, identity.id)
            const listId = parsedQuery.listId ?? defaultList.id
            const list = await lists.findActive(identity.teamId, listId)
            if (!list) throw missingItem()
            if (parsedQuery.status !== 'All' && !list.settings.statuses.includes(parsedQuery.status))
                throw createApplicationError({
                    code: ERROR_CODES.validation,
                    message: 'Choose a status used by this list.',
                    status: HTTP_STATUS.badRequest
                })
            const query = { ...parsedQuery, listId }
            response.json(await repository.list(identity.teamId, query))
        },
        handlePostWorkItemsItemIdArchive: async (request: Request, response: Response) => {
            const identity = requireItemEditor(request)
            const itemId = getItemId(request)
            const item = await repository.setArchived(identity.teamId, itemId, true)
            if (!item) throw missingItem()
            await activities.add(identity.teamId, item.id, identity.id, identity.name, 'updated', 'Archived this task.')
            events.publish(identity.teamId, { type: 'activity', itemId })
            events.publish(identity.teamId)
            response.json({ item })
        },
        handlePostWorkItemsItemIdRestore: async (request: Request, response: Response) => {
            const identity = requireItemEditor(request)
            const itemId = getItemId(request)
            const item = await repository.setArchived(identity.teamId, itemId, false)
            if (!item) throw missingItem()
            await activities.add(identity.teamId, item.id, identity.id, identity.name, 'updated', 'Restored this task.')
            events.publish(identity.teamId, { type: 'activity', itemId })
            events.publish(identity.teamId)
            response.json({ item })
        },
        handlePostWorkItemsItemIdDuplicate: async (request: Request, response: Response) => {
            const identity = requireItemEditor(request)
            const item = await repository.duplicate(identity.teamId, identity.id, getItemId(request))
            if (!item) throw missingItem()
            await activities.add(identity.teamId, item.id, identity.id, identity.name, 'created', 'Duplicated a task.')
            events.publish(identity.teamId, { type: 'activity', itemId: item.id })
            events.publish(identity.teamId)
            response.status(HTTP_STATUS.created).json({ item })
        },

        handlePostWorkItems: async (request: Request, response: Response) => {
            const input = createWorkItemSchema.parse(request.body)
            const identity = requireItemEditor(request)
            if (input.startDate && input.startDate > input.dueDate)
                throw createApplicationError({ code: ERROR_CODES.validation, message: 'Start date must be on or before the due date.', status: HTTP_STATUS.badRequest })
            const defaultList = await lists.ensureDefault(identity.teamId, identity.id)
            const listId = input.listId ?? defaultList.id
            const activeList = await lists.findActive(identity.teamId, listId)
            if (!activeList) throw missingItem()
            if (!activeList.settings.statuses.includes(input.status))
                throw createApplicationError({
                    code: ERROR_CODES.validation,
                    message: 'Choose a status used by this list.',
                    status: HTTP_STATUS.badRequest
                })
            if (input.parentId && !(await repository.canUseAsParent(identity.teamId, listId, input.parentId))) throw missingItem()
            if (!(await repository.canUseDependencies(identity.teamId, listId, undefined, input.dependsOn))) throw missingItem()
            const item = await repository.create(identity.teamId, identity.id, { ...input, listId })
            await activities.add(identity.teamId, item.id, identity.id, identity.name, 'created', 'Created this task.')
            events.publish(identity.teamId, { type: 'activity', itemId: item.id })
            events.publish(identity.teamId)
            response.status(HTTP_STATUS.created).json({ item })
        },
        handleDeleteWorkItems: async (request: Request, response: Response) => {
            const { itemIds } = bulkDeleteWorkItemsSchema.parse(request.body)
            const identity = requireItemEditor(request)
            const results = await repository.deleteMany(identity.teamId, itemIds)
            const deletedIds = results.filter((result) => result.outcome === 'deleted').map((result) => result.itemId)
            await Promise.all(deletedIds.map(async (itemId) => {
                await activities.add(identity.teamId, itemId, identity.id, identity.name, 'deleted', 'Deleted this task in a bulk action.')
            }))
            if (deletedIds.length > 0) events.publish(identity.teamId, { type: 'activity' })
            await comments.deleteForItems(
                identity.teamId,
                deletedIds
            )
            const deletedCount = results.filter((result) => result.outcome === 'deleted').length
            if (deletedCount > 0) events.publish(identity.teamId)
            const status = results.every((result) => result.outcome === 'deleted') ? HTTP_STATUS.ok : HTTP_STATUS.multiStatus
            response.status(status).json({ deletedCount, results })
        },
        handlePatchWorkItemsBulk: async (request: Request, response: Response) => {
            const { itemIds, changes } = bulkUpdateWorkItemsSchema.parse(request.body)
            const identity = requireItemEditor(request)
            if (changes.listId && !(await lists.findActive(identity.teamId, changes.listId))) throw missingItem()
            if (changes.status || changes.listId) {
                for (const itemId of itemIds) {
                    const item = await repository.find(identity.teamId, itemId)
                    if (!item) continue
                    const targetListId = changes.listId ?? item.listId
                    const targetList = targetListId ? await lists.findActive(identity.teamId, targetListId) : null
                    const targetStatus = changes.status ?? item.status
                    if (!targetList || !targetList.settings.statuses.includes(targetStatus))
                        throw createApplicationError({
                            code: ERROR_CODES.validation,
                            message: "The target list must support every selected task's status. Update statuses first or choose a matching status.",
                            status: HTTP_STATUS.badRequest
                        })
                }
            }
            const results = await repository.updateMany(identity.teamId, itemIds, changes)
            const appliedCount = results.filter((result) => result.outcome === 'applied').length
            const changedFields = Object.keys(changes).join(', ')
            await Promise.all(results.filter((result) => result.outcome === 'applied').map(async ({ itemId }) => {
                await activities.add(identity.teamId, itemId, identity.id, identity.name, 'updated', `Bulk-updated ${changedFields}.`)
            }))
            if (appliedCount > 0) events.publish(identity.teamId, { type: 'activity' })
            if (appliedCount > 0) events.publish(identity.teamId)
            const status = results.every((result) => result.outcome === 'applied') ? HTTP_STATUS.ok : HTTP_STATUS.multiStatus
            response.status(status).json({ appliedCount, results })
        },

        handlePatchWorkItemsItemId: async (request: Request, response: Response) => {
            const changes = updateWorkItemSchema.parse(request.body)
            if (Object.keys(changes).length === 0)
                throw createApplicationError({
                    code: ERROR_CODES.validation,
                    message: ERROR_MESSAGES.validation,
                    status: HTTP_STATUS.badRequest
                })
            const identity = requireItemEditor(request)
            if (changes.listId && !(await lists.findActive(identity.teamId, changes.listId))) throw missingItem()
            const currentItem = await repository.find(identity.teamId, getItemId(request))
            if (!currentItem) throw missingItem()
            const nextStartDate = changes.startDate?.toISOString().slice(0, 10) ?? currentItem.startDate
            const nextDueDate = changes.dueDate?.toISOString().slice(0, 10) ?? currentItem.dueDate
            if (nextStartDate > nextDueDate)
                throw createApplicationError({ code: ERROR_CODES.validation, message: 'Start date must be on or before the due date.', status: HTTP_STATUS.badRequest })
            const targetList = await lists.findActive(identity.teamId, changes.listId ?? currentItem.listId)
            if (!targetList) throw missingItem()
            const nextStatus = changes.status ?? currentItem.status
            if (!targetList.settings.statuses.includes(nextStatus))
                throw createApplicationError({
                    code: ERROR_CODES.validation,
                    message: "The task status must exist in its destination list's workflow.",
                    status: HTTP_STATUS.badRequest
                })
            const nextDependencies = changes.dependsOn ?? currentItem.dependsOn
            if (!(await repository.canUseDependencies(identity.teamId, targetList.id, getItemId(request), nextDependencies)))
                throw createApplicationError({
                    code: ERROR_CODES.validation,
                    message: 'Dependencies must be other tasks in this list and cannot create a cycle.',
                    status: HTTP_STATUS.badRequest
                })
            if (nextStatus === 'Done' && !(await repository.dependenciesComplete(identity.teamId, nextDependencies)))
                throw createApplicationError({
                    code: ERROR_CODES.conflict,
                    message: 'Complete this task’s dependencies before marking it done.',
                    status: HTTP_STATUS.conflict
                })
            const item = await repository.update(identity.teamId, getItemId(request), changes)
            if (!item) throw missingItem()
            if (changes.approvalStatus !== undefined && changes.approvalStatus !== currentItem.approvalStatus) {
                const action = changes.approvalStatus === 'pending' ? 'approval_requested' : changes.approvalStatus === 'approved' ? 'approved' : changes.approvalStatus === 'changes_requested' ? 'changes_requested' : 'updated'
                const summary = changes.approvalStatus === 'changes_requested'
                    ? `Changes requested${changes.approvalFeedback ? `: ${changes.approvalFeedback}` : '.'}`
                    : changes.approvalStatus === 'approved' ? 'Approved the client deliverable.'
                      : changes.approvalStatus === 'pending' ? 'Requested client approval.' : 'Cleared client approval.'
                await activities.add(identity.teamId, item.id, identity.id, identity.name, action, summary)
            } else if (changes.approvalFeedback !== undefined && changes.approvalFeedback !== currentItem.approvalFeedback) {
                await activities.add(identity.teamId, item.id, identity.id, identity.name, 'changes_requested', `Updated client feedback: ${changes.approvalFeedback || 'cleared feedback.'}`)
            }
            if (changes.timeSpentMinutes !== undefined && changes.timeSpentMinutes !== currentItem.timeSpentMinutes) {
                const delta = changes.timeSpentMinutes - currentItem.timeSpentMinutes
                await activities.add(identity.teamId, item.id, identity.id, identity.name, 'time_logged', delta > 0 ? `Logged ${String(delta)} minutes. Total tracked: ${String(changes.timeSpentMinutes)} minutes.` : `Adjusted tracked time to ${String(changes.timeSpentMinutes)} minutes.`)
            }
            if (changes.status === 'Done' && currentItem.status !== 'Done') {
                const nextRecurring = await repository.createNextRecurring(identity.teamId, identity.id, getItemId(request), targetList.settings.statuses[0] ?? 'To do')
                if (nextRecurring) {
                    await activities.add(identity.teamId, nextRecurring.id, identity.id, identity.name, 'created', `Created the next task in the recurring series from “${item.title}”.`)
                    events.publish(identity.teamId, { type: 'activity', itemId: nextRecurring.id })
                }
            }
            const changedFields = Object.keys(changes).join(', ')
            await activities.add(identity.teamId, item.id, identity.id, identity.name, 'updated', `Updated ${changedFields}.`)
            events.publish(identity.teamId, { type: 'activity', itemId: item.id })
            events.publish(identity.teamId)
            response.json({ item })
        },
        handleDeleteWorkItemsItemId: async (request: Request, response: Response) => {
            const identity = requireItemEditor(request)
            const itemId = getItemId(request)
            const current = await repository.find(identity.teamId, itemId)
            if (!current || !(await repository.delete(identity.teamId, itemId))) throw missingItem()
            await activities.add(identity.teamId, itemId, identity.id, identity.name, 'deleted', 'Deleted this task.')
            events.publish(identity.teamId, { type: 'activity', itemId })
            await comments.deleteForItems(identity.teamId, [itemId])
            events.publish(identity.teamId)
            response.status(HTTP_STATUS.noContent).end()
        }
})
