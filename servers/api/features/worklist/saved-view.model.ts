import { mongoose, type Model, type Types } from '../../integrations/index.js'

const { model, models, Schema } = mongoose

export type SavedViewRecord = Readonly<{
    teamId: Types.ObjectId
    userId: Types.ObjectId
    name: string
    visibility: 'private' | 'team'
    state: Readonly<Record<string, unknown>>
    createdAt: Date
    updatedAt: Date
}>

const savedViewSchema = new Schema<SavedViewRecord>(
    {
        teamId: { type: Schema.Types.ObjectId, required: true, index: true },
        userId: { type: Schema.Types.ObjectId, required: true, index: true },
        name: { type: String, required: true, trim: true, maxlength: 60 },
        visibility: { type: String, enum: ['private', 'team'], required: true, default: 'private' },
        state: { type: Schema.Types.Mixed, required: true }
    },
    { timestamps: true, strict: 'throw' }
)
savedViewSchema.index({ teamId: 1, userId: 1, name: 1 }, { unique: true })
savedViewSchema.index({ teamId: 1, name: 1 }, { unique: true, partialFilterExpression: { visibility: 'team' } })

export const SavedViewModel: Model<SavedViewRecord> =
    (models.WorklistSavedView as Model<SavedViewRecord> | undefined) ?? model<SavedViewRecord>('WorklistSavedView', savedViewSchema)
