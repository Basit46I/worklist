import { mongoose, type Model, type Types } from '../../integrations/index.js'

const { model, models, Schema } = mongoose

export type WorkItemActivityRecord = Readonly<{
    teamId: Types.ObjectId
    itemId: Types.ObjectId
    actorId: Types.ObjectId
    actorName: string
    action: 'created' | 'updated' | 'commented' | 'deleted' | 'approval_requested' | 'approved' | 'changes_requested' | 'time_logged'
    summary: string
    createdAt: Date
}>

const activitySchema = new Schema<WorkItemActivityRecord>(
    {
        teamId: { type: Schema.Types.ObjectId, required: true },
        itemId: { type: Schema.Types.ObjectId, required: true },
        actorId: { type: Schema.Types.ObjectId, required: true },
        actorName: { type: String, required: true, trim: true, maxlength: 120 },
        action: { type: String, enum: ['created', 'updated', 'commented', 'deleted', 'approval_requested', 'approved', 'changes_requested', 'time_logged'], required: true },
        summary: { type: String, required: true, trim: true, maxlength: 500 }
    },
    { timestamps: { createdAt: true, updatedAt: false }, strict: 'throw' }
)
activitySchema.index({ teamId: 1, itemId: 1, createdAt: -1 })

export const WorkItemActivityModel: Model<WorkItemActivityRecord> =
    (models.WorkItemActivity as Model<WorkItemActivityRecord> | undefined) ?? model<WorkItemActivityRecord>('WorkItemActivity', activitySchema)
