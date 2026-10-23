import { mongoose, type Model, type Types } from '../../integrations/index.js'

const { model, models, Schema } = mongoose

export type AuthUserRecord = Readonly<{
    name: string
    email: string
    passwordHash: string
    emailVerifiedAt?: Date | null
    teamId?: Types.ObjectId
    createdAt: Date
    updatedAt: Date
}>

export type AuthTeamRecord = Readonly<{
    name: string
    ownerId: Types.ObjectId
    members: readonly Readonly<{ userId: Types.ObjectId; role: 'owner' | 'editor' | 'viewer' }>[]
    createdAt: Date
    updatedAt: Date
}>

export type AuthSessionRecord = Readonly<{
    userId: Types.ObjectId
    tokenDigest: string
    expiresAt: Date
    createdAt: Date
}>

export type AuthActionTokenRecord = Readonly<{
    tokenDigest: string
    kind: 'email-verification' | 'password-reset' | 'team-invitation'
    email: string
    teamId?: Types.ObjectId
    role?: 'editor' | 'viewer'
    expiresAt: Date
    createdAt: Date
}>

const userSchema = new Schema<AuthUserRecord>(
    {
        name: { type: String, required: true, trim: true, maxlength: 80 },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
        passwordHash: { type: String, required: true, select: false },
        emailVerifiedAt: { type: Date, default: null },
        teamId: { type: Schema.Types.ObjectId, required: false, index: true }
    },
    { timestamps: true, strict: 'throw' }
)

const teamSchema = new Schema<AuthTeamRecord>(
    {
        name: { type: String, required: true, trim: true, maxlength: 80 },
        ownerId: { type: Schema.Types.ObjectId, required: true, index: true },
        members: [
            {
                _id: false,
                userId: { type: Schema.Types.ObjectId, required: true },
                role: { type: String, enum: ['owner', 'editor', 'viewer'], required: true }
            }
        ]
    },
    { timestamps: true, strict: 'throw' }
)

const sessionSchema = new Schema<AuthSessionRecord>(
    {
        userId: { type: Schema.Types.ObjectId, required: true, index: true },
        tokenDigest: { type: String, required: true, unique: true, select: false },
        expiresAt: { type: Date, required: true },
        createdAt: { type: Date, required: true, default: Date.now }
    },
    { strict: 'throw' }
)
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const actionTokenSchema = new Schema<AuthActionTokenRecord>(
    {
        tokenDigest: { type: String, required: true, unique: true, select: false },
        kind: { type: String, enum: ['email-verification', 'password-reset', 'team-invitation'], required: true },
        email: { type: String, required: true, lowercase: true, trim: true },
        teamId: { type: Schema.Types.ObjectId, required: false },
        role: { type: String, enum: ['editor', 'viewer'], required: false },
        expiresAt: { type: Date, required: true },
        createdAt: { type: Date, required: true, default: Date.now }
    },
    { strict: 'throw' }
)
actionTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const AuthUserModel: Model<AuthUserRecord> =
    (models.WorklistAuthUser as Model<AuthUserRecord> | undefined) ?? model<AuthUserRecord>('WorklistAuthUser', userSchema)
export const AuthTeamModel: Model<AuthTeamRecord> =
    (models.WorklistAuthTeam as Model<AuthTeamRecord> | undefined) ?? model<AuthTeamRecord>('WorklistAuthTeam', teamSchema)
export const AuthSessionModel: Model<AuthSessionRecord> =
    (models.WorklistAuthSession as Model<AuthSessionRecord> | undefined) ?? model<AuthSessionRecord>('WorklistAuthSession', sessionSchema)
export const AuthActionTokenModel: Model<AuthActionTokenRecord> =
    (models.WorklistAuthActionToken as Model<AuthActionTokenRecord> | undefined) ??
    model<AuthActionTokenRecord>('WorklistAuthActionToken', actionTokenSchema)
