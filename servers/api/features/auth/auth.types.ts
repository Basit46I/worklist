export type AuthIdentity = Readonly<{
    id: string
    name: string
    email: string
    teamId: string
    teamName: string
    role: 'owner' | 'editor' | 'viewer'
}>

export type AuthSession = Readonly<{
    identity: AuthIdentity
    token: string
    expiresAt: Date
}>

export type AuthTeamMember = Readonly<{ id: string; name: string; email: string; role: AuthIdentity['role'] }>

export type AuthRepository = Readonly<{
    createAccount: (input: Readonly<{ name: string; email: string; passwordHash: string; teamName: string }>) => Promise<AuthIdentity>
    findUserByEmail: (
        email: string
    ) => Promise<Readonly<{
        id: string
        name: string
        email: string
        teamId: string
        teamName: string
        role: AuthIdentity['role']
        emailVerified: boolean
        passwordHash: string
    }> | null>
    createSession: (input: Readonly<{ userId: string; tokenDigest: string; expiresAt: Date }>) => Promise<void>
    findSessionIdentity: (tokenDigest: string, now: Date) => Promise<AuthIdentity | null>
    deleteSession: (tokenDigest: string) => Promise<void>
    createActionToken: (
        input: Readonly<{
            tokenDigest: string
            kind: 'email-verification' | 'password-reset' | 'team-invitation'
            email: string
            expiresAt: Date
            teamId?: string
            role?: 'editor' | 'viewer'
        }>
    ) => Promise<void>
    consumeActionToken: (tokenDigest: string, kind: 'email-verification' | 'password-reset', now: Date) => Promise<string | null>
    markEmailVerified: (email: string) => Promise<boolean>
    updatePassword: (email: string, passwordHash: string) => Promise<boolean>
    acceptInvitation: (input: Readonly<{ tokenDigest: string; name: string; passwordHash: string; now: Date }>) => Promise<AuthIdentity | null>
    listTeamMembers: (teamId: string) => Promise<readonly AuthTeamMember[]>
    updateTeamMemberRole: (teamId: string, memberId: string, role: 'editor' | 'viewer') => Promise<boolean>
    removeTeamMember: (teamId: string, memberId: string) => Promise<boolean>
}>

export type AuthService = Readonly<{
    register: (
        input: Readonly<{ name: string; email: string; password: string; teamName: string }>
    ) => Promise<Readonly<{ verificationRequired: true }>>
    login: (input: Readonly<{ email: string; password: string }>) => Promise<AuthSession>
    getSession: (token: string | null) => Promise<AuthIdentity | null>
    logout: (token: string | null) => Promise<void>
    requestPasswordReset: (email: string) => Promise<void>
    resetPassword: (token: string, password: string) => Promise<void>
    verifyEmail: (token: string) => Promise<void>
    inviteMember: (owner: AuthIdentity, email: string, role: 'editor' | 'viewer', taskTitle?: string) => Promise<void>
    acceptInvitation: (input: Readonly<{ token: string; name: string; password: string }>) => Promise<AuthSession>
    requestEmailVerification: (email: string) => Promise<void>
    listTeamMembers: (actor: AuthIdentity) => Promise<readonly AuthTeamMember[]>
    updateTeamMemberRole: (actor: AuthIdentity, memberId: string, role: 'editor' | 'viewer') => Promise<void>
    removeTeamMember: (actor: AuthIdentity, memberId: string) => Promise<void>
}>
