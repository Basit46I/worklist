import { mongoose } from '../../integrations/index.js'
import { SavedViewModel } from './saved-view.model.js'
import type { SavedViewState } from './saved-view.validation.js'

export const createSavedViewRepository = () =>
    Object.freeze({
        list: async (teamId: string, userId: string) => {
            const views = await SavedViewModel.find({ teamId, $or: [{ userId }, { visibility: 'team' }] })
                .sort({ name: 1 })
                .lean()
                .exec()
            return views.map((view) => ({
                id: view._id.toString(),
                name: view.name,
                visibility: view.visibility === 'team' ? 'team' : 'private',
                canManage: view.userId.toString() === userId,
                state: view.state as SavedViewState
            }))
        },
        create: async (teamId: string, userId: string, name: string, state: SavedViewState, visibility: 'private' | 'team') => {
            const view = await SavedViewModel.create({ teamId, userId, name, state, visibility })
            return { id: view._id.toString(), name: view.name, visibility: view.visibility, canManage: true, state }
        },
        update: async (teamId: string, userId: string, viewId: string, name: string, state: SavedViewState, visibility: 'private' | 'team') => {
            if (!mongoose.Types.ObjectId.isValid(viewId)) return null
            const view = await SavedViewModel.findOneAndUpdate(
                { _id: viewId, teamId, userId },
                { $set: { name, state, visibility } },
                { new: true, runValidators: true }
            )
                .lean()
                .exec()
            return view
                ? {
                      id: view._id.toString(),
                      name: view.name,
                      visibility: view.visibility === 'team' ? 'team' : 'private',
                      canManage: true,
                      state: view.state as SavedViewState
                  }
                : null
        },
        delete: async (teamId: string, userId: string, viewId: string) => {
            if (!mongoose.Types.ObjectId.isValid(viewId)) return false
            const result = await SavedViewModel.deleteOne({ _id: viewId, teamId, userId }).exec()
            return result.deletedCount > 0
        }
    })
