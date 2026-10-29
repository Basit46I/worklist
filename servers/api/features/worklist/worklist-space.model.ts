import { mongoose, type Model, type Types } from '../../integrations/index.js'

const { model, models, Schema } = mongoose

export type WorklistSpaceRecord = Readonly<{
    teamId: Types.ObjectId
    createdBy: Types.ObjectId
    name: string
    nameKey: string
    description: string
    archivedAt: Date | null
    createdAt: Date
    updatedAt: Date
}>

const spaceSchema = new Schema<WorklistSpaceRecord>(
    {
        teamId: { type: Schema.Types.ObjectId, required: true, index: true },
        createdBy: { type: Schema.Types.ObjectId, required: true },
        name: { type: String, required: true, trim: true, maxlength: 80 },
        nameKey: { type: String, required: true },
        description: { type: String, trim: true, maxlength: 500, default: '' },
        archivedAt: { type: Date, default: null }
    },
    { timestamps: true, strict: 'throw' }
)

spaceSchema.index({ teamId: 1, nameKey: 1 }, { unique: true, partialFilterExpression: { archivedAt: null } })

export const WorklistSpaceModel: Model<WorklistSpaceRecord> =
    (models.WorklistSpace as Model<WorklistSpaceRecord> | undefined) ?? model<WorklistSpaceRecord>('WorklistSpace', spaceSchema)
