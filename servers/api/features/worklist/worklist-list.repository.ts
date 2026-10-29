import { createHash, randomBytes } from 'node:crypto'
import { mongoose, type Types } from '../../integrations/index.js'
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
    spaceId?: Types.ObjectId | string
    folderId?: Types.ObjectId | string
    isDefault: boolean
    archivedAt?: Date | null
    requestFormTokenHash?: string | null
    settings: ListSettings
}) => ({
    id: String(list._id),
    name: list.name,
    description: list.description,
    spaceName: list.spaceName ?? 'General',
    folderName: list.folderName ?? '',
    spaceId: list.spaceId ? (typeof list.spaceId === 'string' ? list.spaceId : list.spaceId.toHexString()) : null,
    folderId: list.folderId ? (typeof list.folderId === 'string' ? list.folderId : list.folderId.toHexString()) : null,
    isDefault: list.isDefault,
    archivedAt: list.archivedAt?.toISOString() ?? null,
    requestFormEnabled: Boolean(list.requestFormTokenHash),
    settings: { ...list.settings, statuses: list.settings.statuses, budgetMinutes: list.settings.budgetMinutes }
})

export const createWorklistListRepository = () =>
    Object.freeze({
        ensureDefault: async (teamId: string, userId: string, location?: Readonly<{ spaceId: string; spaceName: string }>) => {
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
                    },
                    ...(location ? { $set: { spaceId: location.spaceId, spaceName: location.spaceName, folderName: '' } } : {})
                },
                { upsert: true, new: true, runValidators: true }
            )
                .lean()
                .exec()
            await WorkItemModel.updateMany({ teamId, $or: [{ listId: { $exists: false } }, { listId: null }] }, { $set: { listId: list._id } }).exec()
            return serialize(list)
        },
        list: async (teamId: string, includeArchived: boolean) => {
            const records = await WorklistListModel.find({ teamId, ...(includeArchived ? {} : { archivedAt: null }) }).select('+requestFormTokenHash')
                .sort({ isDefault: -1, nameKey: 1, _id: 1 })
                .lean()
                .exec()
            return records.map(serialize)
        },
        findActive: async (teamId: string, listId: string) => {
            if (!mongoose.Types.ObjectId.isValid(listId)) return null
            const list = await WorklistListModel.findOne({ _id: listId, teamId, archivedAt: null }).select('+requestFormTokenHash').lean().exec()
            return list ? serialize(list) : null
        },
        createRequestForm: async (teamId: string, listId: string) => {
            if (!mongoose.Types.ObjectId.isValid(listId)) return null
            const token = randomBytes(32).toString('base64url')
            const tokenHash = createHash('sha256').update(token).digest('hex')
            const list = await WorklistListModel.findOneAndUpdate(
                { _id: listId, teamId, archivedAt: null },
                { $set: { requestFormTokenHash: tokenHash } },
                { returnDocument: 'after', runValidators: true }
            ).select('+requestFormTokenHash').lean().exec()
            return list ? { list: serialize(list), token } : null
        },
        revokeRequestForm: async (teamId: string, listId: string) => {
            if (!mongoose.Types.ObjectId.isValid(listId)) return false
            const result = await WorklistListModel.updateOne({ _id: listId, teamId }, { $set: { requestFormTokenHash: null } }).exec()
            return result.matchedCount > 0
        },
        findByRequestFormToken: async (token: string) => {
            if (!/^[A-Za-z\d_-]{40,60}$/.test(token)) return null
            const tokenHash = createHash('sha256').update(token).digest('hex')
            const list = await WorklistListModel.findOne({ requestFormTokenHash: tokenHash, archivedAt: null })
                .select('+requestFormTokenHash teamId createdBy name description settings.statuses')
                .lean().exec()
            return list ? {
                id: String(list._id), teamId: String(list.teamId), createdBy: String(list.createdBy), name: list.name,
                description: list.description, initialStatus: list.settings.statuses[0] ?? 'To do'
            } : null
        },
        create: async (
            teamId: string,
            userId: string,
            name: string,
            description = '',
            spaceName = 'General',
            folderName = '',
            statuses: readonly string[] = defaultSettings.statuses,
            location?: Readonly<{ spaceId: string; folderId: string | null }>
        ) => {
            const normalized = name.trim()
            const record = await WorklistListModel.create({
                teamId,
                createdBy: userId,
                name: normalized,
                description,
                spaceName,
                folderName,
                ...(location ? { spaceId: location.spaceId, ...(location.folderId ? { folderId: location.folderId } : {}) } : {}),
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
            changes: Readonly<{ name?: string; description?: string; spaceName?: string; folderName?: string; spaceId?: string; folderId?: string | null; settings?: ListSettings }>
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
            if (changes.spaceId !== undefined) set.spaceId = changes.spaceId
            if (changes.folderId !== undefined) {
                if (changes.folderId === null) set.folderId = null
                else set.folderId = changes.folderId
            }
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
                ...(source.spaceId ? { spaceId: source.spaceId } : {}),
                ...(source.folderId ? { folderId: source.folderId } : {}),
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
