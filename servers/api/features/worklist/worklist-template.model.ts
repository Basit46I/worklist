import { mongoose, type Model, type Types } from '../../integrations/index.js'

const { model, models, Schema } = mongoose

export type WorklistTemplateRecord = Readonly<{
    teamId: Types.ObjectId
    createdBy: Types.ObjectId
    name: string
    nameKey: string
    description: string
    statuses: readonly string[]
    tasks: readonly Readonly<{ title: string; description: string; status: string; priority: 'Low' | 'Medium' | 'High'; dueDateOffsetDays: number }>[]
    createdAt: Date
    updatedAt: Date
}>

const taskSchema = new Schema(
    {
        title: { type: String, required: true, trim: true, maxlength: 200 },
        description: { type: String, trim: true, maxlength: 2000, default: '' },
        status: { type: String, required: true, trim: true, maxlength: 40 },
        priority: { type: String, enum: ['Low', 'Medium', 'High'], required: true },
        dueDateOffsetDays: { type: Number, min: 0, max: 3650, required: true }
    },
    { _id: false, strict: 'throw' }
)

const templateSchema = new Schema<WorklistTemplateRecord>(
    {
        teamId: { type: Schema.Types.ObjectId, required: true, index: true },
        createdBy: { type: Schema.Types.ObjectId, required: true },
        name: { type: String, required: true, trim: true, maxlength: 80 },
        nameKey: { type: String, required: true },
        description: { type: String, trim: true, maxlength: 500, default: '' },
        statuses: { type: [String], required: true },
        tasks: { type: [taskSchema], required: true, default: [] }
    },
    { timestamps: true, strict: 'throw' }
)

templateSchema.index({ teamId: 1, nameKey: 1 }, { unique: true })

export const WorklistTemplateModel: Model<WorklistTemplateRecord> =
    (models.WorklistTemplate as Model<WorklistTemplateRecord> | undefined) ?? model<WorklistTemplateRecord>('WorklistTemplate', templateSchema)
