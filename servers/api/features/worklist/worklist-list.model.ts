import { mongoose, type Model, type Types } from '../../integrations/index.js'

const { model, models, Schema } = mongoose

export type WorklistListRecord = Readonly<{
    teamId: Types.ObjectId
    createdBy: Types.ObjectId
    name: string
    description: string
    spaceName: string
    folderName: string
    spaceId?: Types.ObjectId
    folderId?: Types.ObjectId
    nameKey: string
    isDefault: boolean
    archivedAt: Date | null
    requestFormTokenHash?: string | null
    settings: Readonly<{
        sortField: 'title' | 'status' | 'priority' | 'assignee' | 'dueDate'
        sortDirection: 'asc' | 'desc'
        groupBy: 'Off' | 'status' | 'priority' | 'assignee' | 'dueDate'
        visibleColumns: readonly ('status' | 'priority' | 'assignee' | 'dueDate')[]
        columnWidths: Readonly<{ status: number; priority: number; assignee: number; dueDate: number }>
        statuses: readonly string[]
        budgetMinutes: number
    }>
    createdAt: Date
    updatedAt: Date
}>

const listSchema = new Schema<WorklistListRecord>(
    {
        teamId: { type: Schema.Types.ObjectId, required: true, index: true },
        createdBy: { type: Schema.Types.ObjectId, required: true },
        name: { type: String, required: true, trim: true, maxlength: 80 },
        description: { type: String, trim: true, maxlength: 500, default: '' },
        spaceName: { type: String, trim: true, maxlength: 80, default: 'General' },
        folderName: { type: String, trim: true, maxlength: 80, default: '' },
        spaceId: { type: Schema.Types.ObjectId, index: true },
        folderId: { type: Schema.Types.ObjectId, index: true },
        nameKey: { type: String, required: true },
        isDefault: { type: Boolean, required: true, default: false },
        archivedAt: { type: Date, default: null },
        requestFormTokenHash: { type: String, default: null, select: false, index: true },
        settings: {
            sortField: { type: String, enum: ['title', 'status', 'priority', 'assignee', 'dueDate'], required: true, default: 'dueDate' },
            sortDirection: { type: String, enum: ['asc', 'desc'], required: true, default: 'asc' },
            groupBy: { type: String, enum: ['Off', 'status', 'priority', 'assignee', 'dueDate'], required: true, default: 'status' },
            visibleColumns: {
                type: [String],
                enum: ['status', 'priority', 'assignee', 'dueDate'],
                required: true,
                default: ['status', 'priority', 'assignee', 'dueDate']
            },
            columnWidths: {
                status: { type: Number, min: 100, max: 480, default: 150 },
                priority: { type: Number, min: 100, max: 480, default: 120 },
                assignee: { type: Number, min: 100, max: 480, default: 180 },
                dueDate: { type: Number, min: 100, max: 480, default: 140 }
            },
            statuses: { type: [String], required: true, default: ['To do', 'In progress', 'Done'] },
            budgetMinutes: { type: Number, min: 0, max: 10_000_000, required: true, default: 0 }
        }
    },
    { timestamps: true, strict: 'throw' }
)

listSchema.index({ teamId: 1, nameKey: 1 }, { unique: true, partialFilterExpression: { archivedAt: null } })
listSchema.index({ teamId: 1, isDefault: 1 }, { unique: true, partialFilterExpression: { isDefault: true } })

export const WorklistListModel: Model<WorklistListRecord> =
    (models.WorklistList as Model<WorklistListRecord> | undefined) ?? model<WorklistListRecord>('WorklistList', listSchema)
