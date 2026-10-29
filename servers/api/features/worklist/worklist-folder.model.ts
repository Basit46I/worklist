import { mongoose, type Model, type Types } from '../../integrations/index.js'

const { model, models, Schema } = mongoose

export type WorklistFolderRecord = Readonly<{
    teamId: Types.ObjectId
    spaceId: Types.ObjectId
    createdBy: Types.ObjectId
    name: string
    nameKey: string
    archivedAt: Date | null
    createdAt: Date
    updatedAt: Date
}>

const folderSchema = new Schema<WorklistFolderRecord>(
    {
        teamId: { type: Schema.Types.ObjectId, required: true, index: true },
        spaceId: { type: Schema.Types.ObjectId, required: true, index: true },
        createdBy: { type: Schema.Types.ObjectId, required: true },
        name: { type: String, required: true, trim: true, maxlength: 80 },
        nameKey: { type: String, required: true },
        archivedAt: { type: Date, default: null }
    },
    { timestamps: true, strict: 'throw' }
)

folderSchema.index({ teamId: 1, spaceId: 1, nameKey: 1 }, { unique: true, partialFilterExpression: { archivedAt: null } })

export const WorklistFolderModel: Model<WorklistFolderRecord> =
    (models.WorklistFolder as Model<WorklistFolderRecord> | undefined) ?? model<WorklistFolderRecord>('WorklistFolder', folderSchema)
