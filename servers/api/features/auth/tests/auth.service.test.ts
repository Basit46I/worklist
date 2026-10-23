import test from 'node:test'
import assert from 'node:assert/strict'
import { createAuthService } from '../auth.service.js'
import type { AuthIdentity, AuthRepository } from '../auth.types.js'

const owner: AuthIdentity = {
    id: 'owner-1',
    name: 'Owner',
    email: 'owner@example.test',
    teamId: 'team-1',
    teamName: 'Design',
    role: 'owner'
}
const viewer: AuthIdentity = { ...owner, id: 'viewer-1', role: 'viewer' }

void test('non-owners cannot access team member management', async () => {
    const calls: string[] = []
    const repository = {
        listTeamMembers: (teamId: string) => {
            calls.push(teamId)
            return Promise.resolve([])
        }
    } as unknown as AuthRepository
    const service = createAuthService({ repository, isPersistenceAvailable: () => true })

    await assert.rejects(
        service.listTeamMembers(viewer),
        (error: unknown) => typeof error === 'object' && error !== null && 'status' in error && error.status === 403
    )
    assert.deepEqual(calls, [])
})

void test("owner member operations stay scoped to the owner's team", async () => {
    const calls: string[] = []
    const repository = {
        listTeamMembers: (teamId: string) => {
            calls.push(`list:${teamId}`)
            return Promise.resolve([])
        },
        updateTeamMemberRole: (teamId: string, memberId: string, role: string) => {
            calls.push(`update:${teamId}:${memberId}:${role}`)
            return Promise.resolve(true)
        },
        removeTeamMember: (teamId: string, memberId: string) => {
            calls.push(`remove:${teamId}:${memberId}`)
            return Promise.resolve(true)
        }
    } as unknown as AuthRepository
    const service = createAuthService({ repository, isPersistenceAvailable: () => true })

    await service.listTeamMembers(owner)
    await service.updateTeamMemberRole(owner, 'member-2', 'editor')
    await service.removeTeamMember(owner, 'member-3')

    assert.deepEqual(calls, ['list:team-1', 'update:team-1:member-2:editor', 'remove:team-1:member-3'])
})
