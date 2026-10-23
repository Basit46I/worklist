import { Types } from '../../integrations/index.js'
import { AuthActionTokenModel, AuthSessionModel, AuthTeamModel, AuthUserModel, type AuthTeamRecord } from './auth.model.js'
import type { AuthIdentity, AuthRepository } from './auth.types.js'

const toIdentity = (
    user: Readonly<{ _id: Types.ObjectId; name: string; email: string; teamId?: Types.ObjectId }>,
    teamName: string,
    role: AuthIdentity['role']
): AuthIdentity => {
    if (!user.teamId) throw new Error('Auth user is missing its team ownership reference.')
    return Object.freeze({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        teamId: user.teamId.toString(),
        teamName,
        role
    })
}

const getTeamMembers = (team: AuthTeamRecord): AuthTeamRecord['members'] => {
    const members: unknown = (team as unknown as Readonly<{ members?: unknown }>).members
    return Array.isArray(members) ? (members as AuthTeamRecord['members']) : []
}

export const createAuthRepository = (): AuthRepository =>
    Object.freeze({
        createAccount: async ({ name, email, passwordHash, teamName }) => {
            const user = await AuthUserModel.create({ name, email, passwordHash })
            try {
                const team = await AuthTeamModel.create({
                    name: teamName,
                    ownerId: user._id,
                    members: [{ userId: user._id, role: 'owner' }]
                })
                await AuthUserModel.updateOne({ _id: user._id }, { $set: { teamId: team._id } }).exec()
                return Object.freeze({
                    id: String(user._id),
                    name: user.name,
                    email: user.email,
                    teamId: String(team._id),
                    teamName: team.name,
                    role: 'owner'
                })
            } catch (error) {
                await AuthTeamModel.deleteOne({ ownerId: user._id })
                await AuthUserModel.deleteOne({ _id: user._id })
                if (error instanceof Error) throw error
                throw new Error('Failed to create the account and team.', { cause: error })
            }
        },
        findUserByEmail: async (email) => {
            const user = await AuthUserModel.findOne({ email }).select('+passwordHash').lean().exec()
            if (!user?.teamId) return null
            const team = await AuthTeamModel.findById(user.teamId).lean().exec()
            if (!team) return null
            const membership = getTeamMembers(team).find((member) => member.userId.equals(user._id))
            const role = membership?.role ?? (team.ownerId.equals(user._id) ? 'owner' : null)
            if (!role) return null
            return Object.freeze({
                id: String(user._id),
                name: user.name,
                email: user.email,
                teamId: String(user.teamId),
                teamName: team.name,
                role,
                emailVerified: user.emailVerifiedAt !== null,
                passwordHash: user.passwordHash
            })
        },
        createSession: async ({ userId, tokenDigest, expiresAt }) => {
            await AuthSessionModel.create({ userId, tokenDigest, expiresAt })
        },
        findSessionIdentity: async (tokenDigest, now) => {
            const session = await AuthSessionModel.findOne({ tokenDigest, expiresAt: { $gt: now } })
                .select('+tokenDigest')
                .lean()
                .exec()
            if (!session) return null
            const user = await AuthUserModel.findById(session.userId).lean().exec()
            if (!user?.teamId) return null
            if (user.emailVerifiedAt === null) return null
            const team = await AuthTeamModel.findById(user.teamId).lean().exec()
            if (!team) return null
            const membership = getTeamMembers(team).find((member) => member.userId.equals(user._id))
            const role = membership?.role ?? (team.ownerId.equals(user._id) ? 'owner' : null)
            return role ? toIdentity(user, team.name, role) : null
        },
        deleteSession: async (tokenDigest) => {
            await AuthSessionModel.deleteOne({ tokenDigest }).exec()
        },
        createActionToken: async ({ tokenDigest, kind, email, expiresAt, teamId, role }) => {
            await AuthActionTokenModel.create({ tokenDigest, kind, email, expiresAt, ...(teamId ? { teamId } : {}), ...(role ? { role } : {}) })
        },
        consumeActionToken: async (tokenDigest, kind, now) => {
            const token = await AuthActionTokenModel.findOneAndDelete({ tokenDigest, kind, expiresAt: { $gt: now } })
                .lean()
                .exec()
            return token?.email ?? null
        },
        markEmailVerified: async (email) => {
            const result = await AuthUserModel.updateOne({ email, emailVerifiedAt: null }, { $set: { emailVerifiedAt: new Date() } }).exec()
            return result.modifiedCount === 1
        },
        updatePassword: async (email, passwordHash) => {
            const user = await AuthUserModel.findOneAndUpdate({ email }, { $set: { passwordHash } }, { new: true }).select('_id').lean().exec()
            if (!user) return false
            await AuthSessionModel.deleteMany({ userId: user._id }).exec()
            return true
        },
        acceptInvitation: async ({ tokenDigest, name, passwordHash, now }) => {
            const invitation = await AuthActionTokenModel.findOneAndDelete({ tokenDigest, kind: 'team-invitation', expiresAt: { $gt: now } })
                .lean()
                .exec()
            if (!invitation?.teamId || !invitation.role) return null
            const team = await AuthTeamModel.findById(invitation.teamId).lean().exec()
            if (!team) return null
            let createdUserId: Types.ObjectId | undefined
            let linkedExistingUserId: Types.ObjectId | undefined
            try {
                const existingUser = await AuthUserModel.findOne({ email: invitation.email }).lean().exec()
                if (existingUser?.teamId) return null
                const userId = existingUser?._id ?? new Types.ObjectId()
                if (existingUser) {
                    linkedExistingUserId = userId
                    const linkResult = await AuthUserModel.updateOne(
                        { _id: userId, teamId: { $exists: false } },
                        { $set: { name, passwordHash, teamId: team._id, emailVerifiedAt: new Date() } }
                    ).exec()
                    if (linkResult.modifiedCount !== 1) return null
                } else {
                    const createdUser = await AuthUserModel.create({
                        _id: userId,
                        name,
                        email: invitation.email,
                        passwordHash,
                        teamId: team._id,
                        emailVerifiedAt: new Date()
                    })
                    createdUserId = createdUser._id
                }
                const membershipResult = await AuthTeamModel.updateOne(
                    { _id: team._id },
                    { $push: { members: { userId, role: invitation.role } } }
                ).exec()
                if (membershipResult.modifiedCount !== 1) throw new Error('The invited team is no longer available.')
                const user = await AuthUserModel.findById(userId).lean().exec()
                if (!user) throw new Error('The invited account could not be loaded.')
                return toIdentity(user, team.name, invitation.role)
            } catch (error) {
                if (createdUserId) await AuthUserModel.deleteOne({ _id: createdUserId })
                if (linkedExistingUserId) await AuthUserModel.updateOne({ _id: linkedExistingUserId }, { $unset: { teamId: 1 } }).exec()
                if (error instanceof Error) throw error
                throw new Error('Failed to accept the team invitation.', { cause: error })
            }
        },
        listTeamMembers: async (teamId) => {
            const team = await AuthTeamModel.findById(teamId).lean().exec()
            if (!team) return []
            const currentMembers = getTeamMembers(team)
            const memberships = currentMembers.length > 0 ? currentMembers : [{ userId: team.ownerId, role: 'owner' as const }]
            const users = await AuthUserModel.find({ _id: { $in: memberships.map((member) => member.userId) } })
                .lean()
                .exec()
            const usersById = new Map(users.map((user) => [user._id.toString(), user]))
            return Object.freeze(
                memberships.flatMap((member) => {
                    const user = usersById.get(member.userId.toString())
                    return user ? [Object.freeze({ id: String(user._id), name: user.name, email: user.email, role: member.role })] : []
                })
            )
        },
        updateTeamMemberRole: async (teamId, memberId, role) => {
            const result = await AuthTeamModel.updateOne(
                { _id: teamId, ownerId: { $ne: memberId }, 'members.userId': memberId },
                { $set: { 'members.$[member].role': role } },
                { arrayFilters: [{ 'member.userId': memberId }], runValidators: true }
            ).exec()
            return result.modifiedCount === 1
        },
        removeTeamMember: async (teamId, memberId) => {
            const result = await AuthTeamModel.updateOne(
                { _id: teamId, ownerId: { $ne: memberId }, 'members.userId': memberId },
                { $pull: { members: { userId: memberId } } }
            ).exec()
            if (result.modifiedCount !== 1) return false
            await AuthUserModel.updateOne({ _id: memberId, teamId }, { $unset: { teamId: 1 } }).exec()
            await AuthSessionModel.deleteMany({ userId: memberId }).exec()
            return true
        }
    })
