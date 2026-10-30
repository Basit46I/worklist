import { mongoose } from '../../integrations/index.js'
import { WorkItemModel } from './work-item.model.js'
import type { CreateWorkItemInput, UpdateWorkItemInput } from './work-item.validation.js'
import { mapWithConcurrency, serialize, type BulkDeleteOutcome, type BulkUpdateOutcome } from './work-item.repository.shared.js'

export const createWorkItemMutationRepository = () => Object.freeze({
        create: async (teamId: string, userId: string, input: CreateWorkItemInput & Readonly<{ assigneeEmail?: string }>) => {
            const { listId, parentId, ...values } = input
            const record = await WorkItemModel.create({
                ...values,
                startDate: values.startDate ?? values.dueDate,
                ...(listId ? { listId: new mongoose.Types.ObjectId(listId) } : {}),
                ...(parentId ? { parentId: new mongoose.Types.ObjectId(parentId) } : {}),
                dependsOn: input.dependsOn.map((id) => new mongoose.Types.ObjectId(id)),
                teamId,
                createdBy: userId
            })
            return serialize(record)
        },
        update: async (teamId: string, itemId: string, changes: UpdateWorkItemInput & Readonly<{ assigneeEmail?: string }>, expectedUpdatedAt?: Date) => {
            if (!mongoose.Types.ObjectId.isValid(itemId)) return null
            const { dependsOn, ...fields } = changes
            const update = { ...fields, ...(dependsOn !== undefined ? { dependsOn: dependsOn.map((id) => new mongoose.Types.ObjectId(id)) } : {}) }
            const record = await WorkItemModel.findOneAndUpdate({ _id: itemId, teamId, ...(expectedUpdatedAt ? { updatedAt: expectedUpdatedAt } : {}) }, { $set: update }, { returnDocument: 'after', runValidators: true })
                .lean()
                .exec()
            return record ? serialize(record) : null
        },
        setArchived: async (teamId: string, itemId: string, archived: boolean) => {
            if (!mongoose.Types.ObjectId.isValid(itemId)) return null
            const record = await WorkItemModel.findOneAndUpdate(
                { _id: itemId, teamId, archivedAt: archived ? null : { $ne: null } },
                { $set: { archivedAt: archived ? new Date() : null } },
                { returnDocument: 'after', runValidators: true }
            ).lean().exec()
            return record ? serialize(record) : null
        },
        duplicate: async (teamId: string, userId: string, itemId: string) => {
            if (!mongoose.Types.ObjectId.isValid(itemId)) return null
            const source = await WorkItemModel.findOne({ _id: itemId, teamId }).lean().exec()
            if (!source) return null
            const record = await WorkItemModel.create({
                teamId, ...(source.listId ? { listId: source.listId } : {}), title: `${source.title} (copy)`, description: source.description,
                status: source.status, priority: source.priority, assignee: source.assignee, assigneeEmail: source.assigneeEmail ?? '', startDate: source.startDate ?? source.dueDate, dueDate: source.dueDate,
                checklist: (source.checklist ?? []).map((entry) => ({ ...entry, completed: false })),
                dependsOn: [], recurrence: null, tags: source.tags ?? [], createdBy: userId
            })
            return serialize(record)
        },
        delete: async (teamId: string, itemId: string) => {
            if (!mongoose.Types.ObjectId.isValid(itemId)) return false
            const result = await WorkItemModel.deleteOne({ _id: itemId, teamId }).exec()
            if (result.deletedCount > 0) await WorkItemModel.updateMany({ teamId, dependsOn: new mongoose.Types.ObjectId(itemId) }, { $pull: { dependsOn: new mongoose.Types.ObjectId(itemId) } }).exec()
            return result.deletedCount > 0
        },
        deleteMany: async (teamId: string, itemIds: readonly string[]) => {
            const outcomes = await mapWithConcurrency(itemIds, 10, async (itemId): Promise<BulkDeleteOutcome> => {
                try {
                    if (!mongoose.Types.ObjectId.isValid(itemId)) return { itemId, outcome: 'not_found' }
                    const result = await WorkItemModel.deleteOne({ teamId, _id: itemId }).exec()
                    return { itemId, outcome: result.deletedCount > 0 ? 'deleted' : 'not_found' }
                } catch {
                    return { itemId, outcome: 'failed' }
                }
            })
            const deletedIds = outcomes.filter((result) => result.outcome === 'deleted').map((result) => result.itemId)
            if (deletedIds.length) {
                const deletedObjectIds = deletedIds.map((id) => new mongoose.Types.ObjectId(id))
                await WorkItemModel.updateMany({ teamId, dependsOn: { $in: deletedObjectIds } }, { $pull: { dependsOn: { $in: deletedObjectIds } } }).exec()
            }
            return outcomes
        },
        updateMany: async (
            teamId: string,
            itemIds: readonly string[],
            changes: Readonly<{
                listId?: string | undefined
                status?: string | undefined
                priority?: string | undefined
                assignee?: string | undefined
                assigneeEmail?: string | undefined
                dueDate?: Date | undefined
            }>
        ) => {
            return mapWithConcurrency(itemIds, 10, async (itemId): Promise<BulkUpdateOutcome> => {
                try {
                    if (!mongoose.Types.ObjectId.isValid(itemId)) return { itemId, outcome: 'not_found' }
                    const record = await WorkItemModel.findOneAndUpdate(
                        { teamId, _id: itemId },
                        { $set: changes },
                        { new: true, runValidators: true, projection: { _id: 1 } }
                    )
                        .lean()
                        .exec()
                    return { itemId, outcome: record ? 'applied' : 'not_found' }
                } catch {
                    return { itemId, outcome: 'failed' }
                }
            })
        }
    })
