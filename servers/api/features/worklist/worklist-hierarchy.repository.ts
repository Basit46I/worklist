import { mongoose } from '../../integrations/index.js'
import { WorklistFolderModel } from './worklist-folder.model.js'
import { WorklistSpaceModel } from './worklist-space.model.js'

const serializeSpace = (space: { _id: unknown; name: string; description: string; archivedAt?: Date | null }) => ({
    id: String(space._id),
    name: space.name,
    description: space.description,
    archivedAt: space.archivedAt?.toISOString() ?? null
})

const serializeFolder = (folder: { _id: unknown; spaceId: unknown; name: string; archivedAt?: Date | null }) => ({
    id: String(folder._id),
    spaceId: String(folder.spaceId),
    name: folder.name,
    archivedAt: folder.archivedAt?.toISOString() ?? null
})

export const createWorklistHierarchyRepository = () => Object.freeze({
    resolveLocation: async (teamId: string, userId: string, spaceName: string, folderName: string) => {
        const normalizedSpace = spaceName.trim() || 'General'
        const space = await WorklistSpaceModel.findOneAndUpdate(
            { teamId, nameKey: normalizedSpace.toLocaleLowerCase(), archivedAt: null },
            { $setOnInsert: { teamId, createdBy: userId, name: normalizedSpace, nameKey: normalizedSpace.toLocaleLowerCase(), description: '', archivedAt: null } },
            { upsert: true, new: true, runValidators: true }
        ).lean().exec()
        const normalizedFolder = folderName.trim()
        if (!normalizedFolder) return { spaceId: String(space._id), folderId: null, spaceName: space.name, folderName: '' }
        const folder = await WorklistFolderModel.findOneAndUpdate(
            { teamId, spaceId: space._id, nameKey: normalizedFolder.toLocaleLowerCase(), archivedAt: null },
            { $setOnInsert: { teamId, spaceId: space._id, createdBy: userId, name: normalizedFolder, nameKey: normalizedFolder.toLocaleLowerCase(), archivedAt: null } },
            { upsert: true, new: true, runValidators: true }
        ).lean().exec()
        return { spaceId: String(space._id), folderId: String(folder._id), spaceName: space.name, folderName: folder.name }
    },
    listSpaces: async (teamId: string) => {
        const records = await WorklistSpaceModel.find({ teamId, archivedAt: null }).sort({ nameKey: 1, _id: 1 }).lean().exec()
        return records.map(serializeSpace)
    },
    createSpace: async (teamId: string, userId: string, name: string, description = '') => {
        const normalized = name.trim()
        const record = await WorklistSpaceModel.create({ teamId, createdBy: userId, name: normalized, nameKey: normalized.toLocaleLowerCase(), description, archivedAt: null })
        return serializeSpace(record)
    },
    listFolders: async (teamId: string, spaceId: string) => {
        if (!mongoose.Types.ObjectId.isValid(spaceId)) return null
        const spaceExists = await WorklistSpaceModel.exists({ _id: spaceId, teamId, archivedAt: null }).exec()
        if (!spaceExists) return null
        const records = await WorklistFolderModel.find({ teamId, spaceId, archivedAt: null }).sort({ nameKey: 1, _id: 1 }).lean().exec()
        return records.map(serializeFolder)
    },
    createFolder: async (teamId: string, userId: string, spaceId: string, name: string) => {
        if (!mongoose.Types.ObjectId.isValid(spaceId)) return null
        const spaceExists = await WorklistSpaceModel.exists({ _id: spaceId, teamId, archivedAt: null }).exec()
        if (!spaceExists) return null
        const normalized = name.trim()
        const record = await WorklistFolderModel.create({ teamId, spaceId, createdBy: userId, name: normalized, nameKey: normalized.toLocaleLowerCase(), archivedAt: null })
        return serializeFolder(record)
    }
})
