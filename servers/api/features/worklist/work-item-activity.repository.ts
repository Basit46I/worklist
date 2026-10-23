import { mongoose } from '../../integrations/index.js'
import { WorkItemActivityModel } from './work-item-activity.model.js'

export const createWorkItemActivityRepository = () =>
    Object.freeze({
        add: async (
            teamId: string,
            itemId: string,
            actorId: string,
            actorName: string,
            action: 'created' | 'updated' | 'commented' | 'deleted' | 'approval_requested' | 'approved' | 'changes_requested' | 'time_logged',
            summary: string
        ): Promise<void> => {
            await WorkItemActivityModel.create({ teamId, itemId, actorId, actorName, action, summary })
        },
        list: async (teamId: string, itemId: string) => {
            if (!mongoose.Types.ObjectId.isValid(itemId)) return null
            const records = await WorkItemActivityModel.find({ teamId, itemId }).sort({ createdAt: -1, _id: -1 }).limit(100).lean().exec()
            return records.reverse().map((record) => ({
                id: record._id.toHexString(),
                actorName: record.actorName,
                action: record.action,
                summary: record.summary,
                createdAt: record.createdAt.toISOString()
            }))
        }
    })
