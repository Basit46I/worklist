import { mongoose } from '../../integrations/index.js'
import { WorkItemModel } from './work-item.model.js'
import { WorklistListModel } from './worklist-list.model.js'
import type { WorklistListRecord } from './worklist-list.model.js'

type ListSettings = WorklistListRecord['settings']
const defaultSettings: ListSettings = {
    sortField: 'dueDate',
    sortDirection: 'asc',
    groupBy: 'status',
    visibleColumns: ['status', 'priority', 'assignee', 'dueDate'],
    columnWidths: { status: 150, priority: 120, assignee: 180, dueDate: 140 },
    statuses: ['To do', 'In progress', 'Done'],
    budgetMinutes: 0
}

const serialize = (list: {
    _id: unknown
    name: string
    description: string
    spaceName?: string
    folderName?: string
    isDefault: boolean
    archivedAt?: Date | null
    settings: ListSettings
}) => ({
    id: String(list._id),
    name: list.name,
    description: list.description,
    spaceName: list.spaceName ?? 'General',
    folderName: list.folderName ?? '',
    isDefault: list.isDefault,
    archivedAt: list.archivedAt?.toISOString() ?? null,
    settings: { ...list.settings, statuses: list.settings.statuses, budgetMinutes: list.settings.budgetMinutes }
})

export const createWorklistListRepository = () =>
    Object.freeze({
        ensureDefault: async (teamId: string, userId: string) => {
            const list = await WorklistListModel.findOneAndUpdate(
                { teamId, isDefault: true },
                {
                    $setOnInsert: {
                        teamId,
                        createdBy: userId,
                        name: 'Tasks',
                        nameKey: 'tasks',
                        isDefault: true,
                        archivedAt: null,
                        settings: defaultSettings
                    }
                },
                { upsert: true, new: true, runValidators: true }
            )
                .lean()
                .exec()
            await WorkItemModel.updateMany({ teamId, $or: [{ listId: { $exists: false } }, { listId: null }] }, { $set: { listId: list._id } }).exec()
            return serialize(list)
        },
        list: async (teamId: string, includeArchived: boolean) => {
            const records = await WorklistListModel.find({ teamId, ...(includeArchived ? {} : { archivedAt: null }) })
                .sort({ isDefault: -1, nameKey: 1, _id: 1 })
                .lean()
                .exec()
            return records.map(serialize)
        },
        findActive: async (teamId: string, listId: string) => {
            if (!mongoose.Types.ObjectId.isValid(listId)) return null
            const list = await WorklistListModel.findOne({ _id: listId, teamId, archivedAt: null }).lean().exec()
            return list ? serialize(list) : null
        },
        create: async (
            teamId: string,
            userId: string,
            name: string,
            description = '',
            spaceName = 'General',
            folderName = '',
            statuses: readonly string[] = defaultSettings.statuses
        ) => {
            const normalized = name.trim()
            const record = await WorklistListModel.create({
                teamId,
                createdBy: userId,
                name: normalized,
                description,
                spaceName,
                folderName,
                nameKey: normalized.toLocaleLowerCase(),
                isDefault: false,
                archivedAt: null,
                settings: { ...defaultSettings, statuses }
            })
            return serialize(record)
        },
        update: async (
            teamId: string,
            listId: string,
            changes: Readonly<{ name?: string; description?: string; spaceName?: string; folderName?: string; settings?: ListSettings }>
        ) => {
            if (!mongoose.Types.ObjectId.isValid(listId)) return null
            const set: Record<string, unknown> = {}
            if (changes.name !== undefined) {
                const name = changes.name.trim()
                set.name = name
                set.nameKey = name.toLocaleLowerCase()
            }
            if (changes.description !== undefined) set.description = changes.description.trim()
            if (changes.spaceName !== undefined) set.spaceName = changes.spaceName.trim()
            if (changes.folderName !== undefined) set.folderName = changes.folderName.trim()
            if (changes.settings !== undefined) set.settings = changes.settings
            const record = await WorklistListModel.findOneAndUpdate(
                { _id: listId, teamId, archivedAt: null },
                { $set: set },
                { new: true, runValidators: true }
            )
                .lean()
                .exec()
            return record ? serialize(record) : null
        },
        duplicate: async (teamId: string, userId: string, listId: string, name: string) => {
            if (!mongoose.Types.ObjectId.isValid(listId)) return null
            const source = await WorklistListModel.findOne({ _id: listId, teamId, archivedAt: null }).lean().exec()
            if (!source) return null
            const record = await WorklistListModel.create({
                teamId,
                createdBy: userId,
                name: name.trim(),
                description: source.description,
                spaceName: source.spaceName,
                folderName: source.folderName,
                nameKey: name.trim().toLocaleLowerCase(),
                isDefault: false,
                archivedAt: null,
                settings: source.settings
            })
            return serialize(record)
        },
        setArchived: async (teamId: string, listId: string, archived: boolean) => {
            if (!mongoose.Types.ObjectId.isValid(listId)) return null
            const record = await WorklistListModel.findOneAndUpdate(
                { _id: listId, teamId, isDefault: false, ...(archived ? { archivedAt: null } : { archivedAt: { $ne: null } }) },
                { $set: { archivedAt: archived ? new Date() : null } },
                { new: true, runValidators: true }
            )
                .lean()
                .exec()
            return record ? serialize(record) : null
        },
        deleteIfEmpty: async (teamId: string, listId: string) => {
            if (!mongoose.Types.ObjectId.isValid(listId)) return 'not_found' as const
            const list = await WorklistListModel.findOne({ _id: listId, teamId, isDefault: false }).lean().exec()
            if (!list) return 'not_found' as const
            if (await WorkItemModel.exists({ teamId, listId }).exec()) return 'not_empty' as const
            await WorklistListModel.deleteOne({ _id: listId, teamId, isDefault: false }).exec()
            return 'deleted' as const
        }
    })
