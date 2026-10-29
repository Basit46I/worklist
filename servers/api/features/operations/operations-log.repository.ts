import { mongoose, type Model } from '../../integrations/index.js'
import type { Logger } from '@workspace/logging'

export type OperationsLogEntry = Readonly<{
    level: 'info' | 'warn' | 'error'
    message: string
    createdAt: Date
    method: string
    route: string
    statusCode: number
    durationMs: number
    requestId: string
    traceId?: string
    spanId?: string
    userId?: string
    teamId?: string
}>

type StoredOperationsLog = OperationsLogEntry & Readonly<{ expiresAt: Date; searchText: string }>
type LogQuery = Readonly<{ teamId: string; search: string; level: 'all' | 'info' | 'warn' | 'error'; before?: Date; limit: number }>

const { model, models, Schema } = mongoose
const schema = new Schema<StoredOperationsLog>(
    {
        level: { type: String, enum: ['info', 'warn', 'error'], required: true },
        message: { type: String, required: true, maxlength: 200 },
        createdAt: { type: Date, required: true },
        method: { type: String, required: true },
        route: { type: String, required: true },
        statusCode: { type: Number, required: true },
        durationMs: { type: Number, required: true },
        requestId: { type: String, required: true },
        traceId: { type: String },
        spanId: { type: String },
        userId: { type: String, index: true },
        teamId: { type: String },
        searchText: { type: String, required: true, maxlength: 600 },
        expiresAt: { type: Date, required: true }
    },
    { strict: 'throw', versionKey: false }
)
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
schema.index({ teamId: 1, createdAt: -1, _id: -1 })
schema.index({ teamId: 1, level: 1, createdAt: -1, _id: -1 })
const OperationsLogModel: Model<StoredOperationsLog> =
    (models.OperationsLog as Model<StoredOperationsLog> | undefined) ?? model<StoredOperationsLog>('OperationsLog', schema)

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const createOperationsLogRepository = (logger?: Logger) => Object.freeze({
    append: async (entry: OperationsLogEntry): Promise<void> => {
        if (mongoose.connection.readyState !== mongoose.ConnectionStates.connected) return
        const createdAt = entry.createdAt
        try {
            const searchText = [entry.message, entry.method, entry.route, entry.requestId, entry.traceId, entry.userId].filter(Boolean).join(' ')
            await OperationsLogModel.create({ ...entry, searchText, expiresAt: new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1_000) })
        } catch (cause) {
            // Logging must never fail or delay the user request.
            logger?.warn('Central request log could not be persisted.', { errorType: cause instanceof Error ? cause.name : 'UnknownPersistenceError' })
        }
    },
    search: async ({ teamId, search, level, before, limit }: LogQuery) => {
        if (mongoose.connection.readyState !== mongoose.ConnectionStates.connected) return { logs: [], nextBefore: null }
        let recordsQuery = OperationsLogModel.find().where('teamId', teamId)
        if (level !== 'all') recordsQuery = recordsQuery.where('level', level)
        if (before) recordsQuery = recordsQuery.where('createdAt').lt(before.getTime())
        if (search) recordsQuery = recordsQuery.where('searchText').regex(new RegExp(escapeRegex(search), 'i'))
        const records = await recordsQuery.sort({ createdAt: -1, _id: -1 }).limit(limit + 1).lean().exec()
        const page = records.slice(0, limit)
        const last = page.at(-1)
        return {
            logs: page.map(({ _id, expiresAt: _expiresAt, searchText: _searchText, ...entry }) => ({ id: String(_id), ...entry, createdAt: entry.createdAt.toISOString() })),
            nextBefore: records.length > limit && last ? last.createdAt.toISOString() : null
        }
    }
})
