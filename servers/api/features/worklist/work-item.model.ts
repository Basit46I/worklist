import { mongoose, type Model, type Types } from '../../integrations/index.js'

const { model, models, Schema } = mongoose

export type WorkItemRecord = Readonly<{
    teamId: Types.ObjectId
    listId?: Types.ObjectId
    parentId?: Types.ObjectId
    title: string
    description: string
    status: string
    priority: 'Low' | 'Medium' | 'High'
    assignee: string
    startDate?: Date
    dueDate: Date
    checklist?: readonly Readonly<{ id: string; text: string; completed: boolean }>[]
    dependsOn?: readonly Types.ObjectId[]
    recurrence: Readonly<{ frequency: 'daily' | 'weekly' | 'monthly'; interval: number }> | null
    recurrenceSeriesId?: Types.ObjectId
    tags?: readonly string[]
    archivedAt?: Date | null
    clientRequest?: Readonly<{ contactName: string; contactEmail: string; request: string }> | null
    approvalStatus?: 'not_requested' | 'pending' | 'approved' | 'changes_requested'
    approvalFeedback?: string
    timeSpentMinutes?: number
    createdBy: Types.ObjectId
    createdAt: Date
    updatedAt: Date
}>

const workItemSchema = new Schema<WorkItemRecord>(
    {
        teamId: { type: Schema.Types.ObjectId, required: true, index: true },
        listId: { type: Schema.Types.ObjectId, required: false, index: true },
        parentId: { type: Schema.Types.ObjectId, required: false, index: true },
        title: { type: String, required: true, trim: true, maxlength: 200 },
        description: { type: String, trim: true, maxlength: 2000, default: '' },
        status: { type: String, required: true, trim: true, maxlength: 40 },
        priority: { type: String, enum: ['Low', 'Medium', 'High'], required: true },
        assignee: { type: String, required: true, trim: true, maxlength: 120 },
        startDate: { type: Date, required: false },
        dueDate: { type: Date, required: true },
        checklist: {
            type: [{ id: { type: String, required: true }, text: { type: String, required: true, trim: true, maxlength: 240 }, completed: { type: Boolean, required: true, default: false } }],
            default: []
        },
        dependsOn: { type: [Schema.Types.ObjectId], default: [] },
        recurrence: {
            type: {
                frequency: { type: String, enum: ['daily', 'weekly', 'monthly'] },
                interval: { type: Number, min: 1, max: 52 }
            },
            default: null
        },
        recurrenceSeriesId: { type: Schema.Types.ObjectId, required: false, index: true },
        tags: { type: [{ type: String, trim: true, maxlength: 32 }], default: [] },
        archivedAt: { type: Date, default: null, index: true },
        clientRequest: {
            type: { contactName: { type: String, trim: true, maxlength: 120 }, contactEmail: { type: String, trim: true, maxlength: 254 }, request: { type: String, trim: true, maxlength: 2000 } },
            default: null
        },
        approvalStatus: { type: String, enum: ['not_requested', 'pending', 'approved', 'changes_requested'], default: 'not_requested' },
        approvalFeedback: { type: String, trim: true, maxlength: 2000, default: '' },
        timeSpentMinutes: { type: Number, min: 0, max: 10_000_000, default: 0 },
        createdBy: { type: Schema.Types.ObjectId, required: true }
    },
    { timestamps: true, strict: 'throw' }
)
workItemSchema.index({ teamId: 1, dueDate: 1 })
workItemSchema.index({ teamId: 1, recurrenceSeriesId: 1, dueDate: 1 }, { unique: true, partialFilterExpression: { recurrenceSeriesId: { $exists: true } } })

export const WorkItemModel: Model<WorkItemRecord> =
    (models.WorklistItem as Model<WorkItemRecord> | undefined) ?? model<WorkItemRecord>('WorklistItem', workItemSchema)
