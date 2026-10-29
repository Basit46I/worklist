import { mongoose } from '../../integrations/index.js'
import { WorkItemModel } from './work-item.model.js'
import type { WorkItemListQuery } from './work-item.validation.js'
import { escapeRegex, nextUtcDay, serialize } from './work-item.repository.shared.js'

type WorkItemFilterQuery = Parameters<typeof WorkItemModel.collection.find>[0]
export const createWorkItemQueryRepository = () => Object.freeze({
        find: async (teamId: string, itemId: string) => {
            if (!mongoose.Types.ObjectId.isValid(itemId)) return null
            const item = await WorkItemModel.findOne({ _id: itemId, teamId }).select({ _id: 1, listId: 1, startDate: 1, dueDate: 1, status: 1, dependsOn: 1, approvalStatus: 1, approvalFeedback: 1, timeSpentMinutes: 1, updatedAt: 1 }).lean().exec()
            return item ? {
                listId: item.listId?.toHexString() ?? '',
                startDate: (item.startDate ?? item.dueDate).toISOString().slice(0, 10),
                dueDate: item.dueDate.toISOString().slice(0, 10),
                status: item.status,
                dependsOn: (item.dependsOn ?? []).map((id) => id.toHexString()),
                approvalStatus: item.approvalStatus ?? 'not_requested',
                approvalFeedback: item.approvalFeedback ?? '',
                timeSpentMinutes: item.timeSpentMinutes ?? 0,
                updatedAt: item.updatedAt
            } : null
        },
        dependenciesComplete: async (teamId: string, dependencyIds: readonly string[]) => {
            if (dependencyIds.length === 0) return true
            const unfinished = await WorkItemModel.exists({ _id: { $in: dependencyIds }, teamId, status: { $ne: 'Done' } }).exec()
            return !unfinished
        },
        createNextRecurring: async (teamId: string, userId: string, itemId: string, firstStatus: string) => {
            if (!mongoose.Types.ObjectId.isValid(itemId)) return null
            const source = await WorkItemModel.findOne({ _id: itemId, teamId, status: 'Done', recurrence: { $ne: null } }).lean().exec()
            if (!source?.recurrence) return null
            const seriesId = source.recurrenceSeriesId ?? source._id
            const nextDate = new Date(source.dueDate)
            const { frequency, interval } = source.recurrence
            if (frequency === 'daily') nextDate.setUTCDate(nextDate.getUTCDate() + interval)
            if (frequency === 'weekly') nextDate.setUTCDate(nextDate.getUTCDate() + 7 * interval)
            if (frequency === 'monthly') {
                const day = nextDate.getUTCDate()
                nextDate.setUTCDate(1)
                nextDate.setUTCMonth(nextDate.getUTCMonth() + interval)
                const lastDay = new Date(Date.UTC(nextDate.getUTCFullYear(), nextDate.getUTCMonth() + 1, 0)).getUTCDate()
                nextDate.setUTCDate(Math.min(day, lastDay))
            }
            try {
                const record = await WorkItemModel.create({
                    teamId,
                    ...(source.listId ? { listId: source.listId } : {}),
                    title: source.title,
                    description: source.description,
                    status: firstStatus,
                    priority: source.priority,
                    assignee: source.assignee,
                    dueDate: nextDate,
                    startDate: source.startDate ?? source.dueDate,
                    checklist: (source.checklist ?? []).map((entry) => ({ ...entry, completed: false })),
                    dependsOn: [],
                    recurrence: source.recurrence,
                    recurrenceSeriesId: seriesId,
                    createdBy: userId
                })
                return serialize(record)
            } catch (error) {
                if (error && typeof error === 'object' && 'code' in error && error.code === 11000) return null
                throw error
            }
        },
        usedStatuses: async (teamId: string, listId: string) => WorkItemModel.distinct('status', { teamId, listId }).exec(),
        canUseAsParent: async (teamId: string, listId: string, parentId: string) => {
            if (!mongoose.Types.ObjectId.isValid(parentId)) return false
            return Boolean(await WorkItemModel.exists({ _id: parentId, teamId, listId, parentId: { $exists: false } }).exec())
        },
        canUseDependencies: async (teamId: string, listId: string, itemId: string | undefined, dependencyIds: readonly string[]) => {
            if (dependencyIds.length === 0) return true
            if (dependencyIds.some((id) => id.toLowerCase() === itemId?.toLowerCase() || !mongoose.Types.ObjectId.isValid(id))) return false
            const matching = await WorkItemModel.find({ _id: { $in: dependencyIds }, teamId, listId }).select({ _id: 1, dependsOn: 1 }).lean().exec()
            if (matching.length !== dependencyIds.length) return false
            if (!itemId) return true
            const visited = new Set<string>()
            let pending = matching.flatMap((record) => (record.dependsOn ?? []).map((id) => id.toHexString()))
            while (pending.length > 0) {
                const batch = [...new Set(pending)].filter((id) => !visited.has(id))
                if (batch.some((id) => id === itemId.toLowerCase())) return false
                for (const id of batch) visited.add(id)
                if (visited.size > 5_000) return false
                const records = await WorkItemModel.find({ _id: { $in: batch }, teamId, listId }).select({ dependsOn: 1 }).lean().exec()
                pending = records.flatMap((record) => (record.dependsOn ?? []).map((id) => id.toHexString()))
            }
            return true
        },
        list: async (teamId: string, query: WorkItemListQuery) => {
            const teamQuery: WorkItemFilterQuery = { teamId }
            if (query.listId) teamQuery.listId = query.listId
            teamQuery.archivedAt = query.includeArchived ? { $ne: null } : null
            const clauses: WorkItemFilterQuery[] = []
            if (query.search) {
                const searchExpression = { $regex: escapeRegex(query.search), $options: 'i' }
                const searchConditions: WorkItemFilterQuery[] = [
                    { title: searchExpression },
                    { description: searchExpression },
                    { status: searchExpression },
                    { priority: searchExpression },
                    { assignee: searchExpression },
                    { tags: searchExpression }
                ]
                const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(query.search) ? new Date(`${query.search}T00:00:00.000Z`) : null
                if (parsedDate && !Number.isNaN(parsedDate.valueOf()) && parsedDate.toISOString().slice(0, 10) === query.search) {
                    const nextDate = new Date(parsedDate)
                    nextDate.setUTCDate(nextDate.getUTCDate() + 1)
                    searchConditions.push({ dueDate: { $gte: parsedDate, $lt: nextDate } })
                }
                clauses.push({ $or: searchConditions })
            }
            if (query.status !== 'All') clauses.push({ status: query.status })
            const filterQueries = query.filters.map((filter): WorkItemFilterQuery => ({
                [filter.field]:
                    filter.operator === 'contains'
                        ? { $regex: escapeRegex(filter.value), $options: 'i' }
                        : filter.field === 'dueDate'
                          ? filter.operator === 'before'
                              ? { $lt: new Date(`${filter.value}T00:00:00.000Z`) }
                              : filter.operator === 'after'
                                ? { $gte: nextUtcDay(filter.value) }
                                : { $gte: new Date(`${filter.value}T00:00:00.000Z`), $lt: nextUtcDay(filter.value) }
                          : filter.value
            }))
            if (filterQueries.length > 0) {
                clauses.push(query.filterLogic === 'AND' ? { $and: filterQueries } : { $or: filterQueries })
            }

            const direction = query.sortDirection === 'asc' ? 1 : -1
            if (query.cursor) {
                const cursorValue = query.sortField === 'dueDate' ? new Date(query.cursor.value) : query.cursor.value
                const operator = direction === 1 ? '$gt' : '$lt'
                clauses.push({
                    $or: [
                        { [query.sortField]: { [operator]: cursorValue } },
                        { [query.sortField]: cursorValue, _id: { [operator]: new mongoose.Types.ObjectId(query.cursor.id) } }
                    ]
                })
            }
            if (clauses.length > 0) teamQuery.$and = clauses

            const records = await WorkItemModel.find(teamQuery)
                .sort({ [query.sortField]: direction, _id: direction })
                .limit(query.limit + 1)
                .lean()
                .exec()
            const hasMore = records.length > query.limit
            const page = records.slice(0, query.limit)
            const last = page.at(-1)
            const lastSortValue = last ? last[query.sortField] : undefined
            const nextCursor =
                hasMore && last
                    ? Buffer.from(
                          JSON.stringify({
                              value: lastSortValue instanceof Date ? lastSortValue.toISOString().slice(0, 10) : lastSortValue,
                              id: String(last._id),
                              field: query.sortField,
                              direction: query.sortDirection
                          })
                      ).toString('base64url')
                    : null
            return { items: page.map(serialize), nextCursor }
        },
})
