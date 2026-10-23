import { mongoose, type Model, type Types } from '../../integrations/index.js'

const { model, models, Schema } = mongoose

export type WorkItemCommentRecord = Readonly<{
    teamId: Types.ObjectId
    workItemId: Types.ObjectId
    authorId: Types.ObjectId
    authorName: string
    body: string
    createdAt: Date
}>

const workItemCommentSchema = new Schema<WorkItemCommentRecord>(
    {
        teamId: { type: Schema.Types.ObjectId, required: true },
        workItemId: { type: Schema.Types.ObjectId, required: true },
        authorId: { type: Schema.Types.ObjectId, required: true },
        authorName: { type: String, required: true, maxlength: 120 },
        body: { type: String, required: true, trim: true, maxlength: 2000 }
    },
    { timestamps: { createdAt: true, updatedAt: false }, strict: 'throw' }
)
workItemCommentSchema.index({ teamId: 1, workItemId: 1, createdAt: 1 })

export const WorkItemCommentModel: Model<WorkItemCommentRecord> =
    (models.WorklistItemComment as Model<WorkItemCommentRecord> | undefined) ??
    model<WorkItemCommentRecord>('WorklistItemComment', workItemCommentSchema)
