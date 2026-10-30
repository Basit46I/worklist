import { WorkItemModel } from './work-item.model.js'
import { AuthUserModel } from '../auth/public.js'

export const createWorkItemReminderRepository = () => Object.freeze({
    findDue: async (today: Date, tomorrow: Date) => WorkItemModel.find({
        archivedAt: null,
        status: { $ne: 'Done' },
        dueDate: { $gte: today, $lt: tomorrow },
        $and: [{ $or: [{ 'clientRequest.contactEmail': { $exists: true, $ne: '' } }, { assigneeEmail: { $exists: true, $ne: '' } }] }],
        $or: [{ dueReminderSentFor: null }, { dueReminderSentFor: { $ne: today.toISOString().slice(0, 10) } }]
    }).select('+dueReminderSentFor').limit(200).lean().exec(),
    findAssigneeEmail: async (teamId: string, assignee: string, assigneeEmail?: string) => {
        if (!assignee || assignee === 'Unassigned') return null
        const user = await AuthUserModel.findOne({ teamId, ...(assigneeEmail ? { email: assigneeEmail } : { name: assignee }) }).select({ email: 1 }).lean().exec()
        return user?.email ?? null
    },
    claimDue: async (itemId: string, dueDate: string) => (await WorkItemModel.updateOne({ _id: itemId, $or: [{ dueReminderClaimedFor: null }, { dueReminderClaimedFor: { $ne: dueDate } }] }, { $set: { dueReminderClaimedFor: dueDate } }).exec()).modifiedCount === 1,
    finishDue: async (itemId: string, dueDate: string, sent: boolean) => WorkItemModel.updateOne({ _id: itemId, dueReminderClaimedFor: dueDate }, sent ? { $set: { dueReminderSentFor: dueDate }, $unset: { dueReminderClaimedFor: 1 } } : { $unset: { dueReminderClaimedFor: 1 } }).exec(),
    findPendingApprovals: async (requestedBefore: Date) => WorkItemModel.find({ approvalStatus: 'pending', approvalRequestedAt: { $lte: requestedBefore }, approvalReminderSentAt: null, 'clientRequest.contactEmail': { $exists: true, $ne: '' } }).limit(200).lean().exec(),
    claimApproval: async (itemId: string) => (await WorkItemModel.updateOne({ _id: itemId, approvalStatus: 'pending', approvalReminderSentAt: null, approvalReminderClaimedAt: null }, { $set: { approvalReminderClaimedAt: new Date() } }).exec()).modifiedCount === 1,
    finishApproval: async (itemId: string, sent: boolean) => WorkItemModel.updateOne({ _id: itemId, approvalReminderClaimedAt: { $ne: null } }, sent ? { $set: { approvalReminderSentAt: new Date() }, $unset: { approvalReminderClaimedAt: 1 } } : { $unset: { approvalReminderClaimedAt: 1 } }).exec()
})
