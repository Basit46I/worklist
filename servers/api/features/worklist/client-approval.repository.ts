import { createHash } from 'node:crypto'
import { mongoose } from '../../integrations/index.js'
import { WorkItemModel } from './work-item.model.js'

const digest = (token: string): string => createHash('sha256').update(token).digest('hex')

export const createClientApprovalRepository = () => Object.freeze({
    request: async (teamId: string, itemId: string, token: string, expiresAt: Date) => {
        if (!mongoose.Types.ObjectId.isValid(itemId)) return null
        const item = await WorkItemModel.findOneAndUpdate(
            { _id: itemId, teamId, archivedAt: null, 'clientRequest.contactEmail': { $exists: true, $ne: '' } },
            { $set: { approvalStatus: 'pending', approvalFeedback: '', approvalTokenHash: digest(token), approvalTokenExpiresAt: expiresAt, approvalRequestedAt: new Date(), approvalReminderSentAt: null } },
            { returnDocument: 'after', runValidators: true }
        ).select('+approvalTokenHash').lean().exec()
        return item ? { id: String(item._id), title: item.title, description: item.description, email: item.clientRequest?.contactEmail ?? '', contactName: item.clientRequest?.contactName ?? '', createdBy: String(item.createdBy), teamId: String(item.teamId) } : null
    },
    revoke: async (itemId: string, token: string) => {
        if (!mongoose.Types.ObjectId.isValid(itemId)) return
        await WorkItemModel.updateOne({ _id: itemId, approvalTokenHash: digest(token) }, { $unset: { approvalTokenHash: 1, approvalTokenExpiresAt: 1 }, $set: { approvalStatus: 'not_requested' } }).exec()
    },
    findByToken: async (token: string, now = new Date()) => {
        if (!/^[A-Za-z\d_-]{40,60}$/.test(token)) return null
        const item = await WorkItemModel.findOne({ approvalTokenHash: digest(token), approvalTokenExpiresAt: { $gt: now }, approvalStatus: 'pending' }).select('+approvalTokenHash').lean().exec()
        return item ? { id: String(item._id), title: item.title, description: item.description, contactName: item.clientRequest?.contactName ?? 'Client', teamId: String(item.teamId), actorId: String(item.createdBy) } : null
    },
    decide: async (token: string, decision: 'approved' | 'changes_requested', feedback: string, now = new Date()) => {
        if (!/^[A-Za-z\d_-]{40,60}$/.test(token)) return null
        const item = await WorkItemModel.findOneAndUpdate(
            { approvalTokenHash: digest(token), approvalTokenExpiresAt: { $gt: now }, approvalStatus: 'pending' },
            { $set: { approvalStatus: decision, approvalFeedback: feedback }, $unset: { approvalTokenHash: 1, approvalTokenExpiresAt: 1, approvalReminderSentAt: 1 } },
            { returnDocument: 'after', runValidators: true }
        ).lean().exec()
        return item ? { id: String(item._id), title: item.title, teamId: String(item.teamId), actorId: String(item.createdBy), contactName: item.clientRequest?.contactName ?? 'Client', contactEmail: item.clientRequest?.contactEmail ?? '' } : null
    }
})
