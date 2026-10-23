import { mongoose } from '../../integrations/index.js'
import { WorkItemCommentModel } from './work-item-comment.model.js'
import { WorkItemModel } from './work-item.model.js'
import type { CreateWorkItemCommentInput } from './work-item-comment.validation.js'

const serialize = (comment: { _id: unknown; authorId: unknown; authorName: string; body: string; createdAt: Date }) => ({
    id: String(comment._id),
    authorId: String(comment.authorId),
    authorName: comment.authorName,
    body: comment.body,
    createdAt: comment.createdAt.toISOString()
})

export const createWorkItemCommentRepository = () =>
    Object.freeze({
        list: async (teamId: string, itemId: string) => {
            if (!mongoose.Types.ObjectId.isValid(itemId)) return null
            if (!(await WorkItemModel.exists({ _id: itemId, teamId }).exec())) return null
            const comments = await WorkItemCommentModel.find({ teamId, workItemId: itemId }).sort({ createdAt: 1, _id: 1 }).lean().exec()
            return comments.map(serialize)
        },
        create: async (teamId: string, itemId: string, authorId: string, authorName: string, input: CreateWorkItemCommentInput) => {
            if (!mongoose.Types.ObjectId.isValid(itemId)) return null
            const exists = await WorkItemModel.exists({ _id: itemId, teamId }).exec()
            if (!exists) return null
            const comment = await WorkItemCommentModel.create({ teamId, workItemId: itemId, authorId, authorName, body: input.body })
            return serialize(comment)
        },
        deleteForItems: async (teamId: string, itemIds: readonly string[]) => {
            if (itemIds.length === 0) return
            await WorkItemCommentModel.deleteMany({ teamId, workItemId: { $in: itemIds } }).exec()
        }
    })
