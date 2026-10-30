import assert from 'node:assert/strict'
import test from 'node:test'
import { createWorkItemAssignmentService } from '../work-item-assignment.service.js'
import type { AuthIdentity } from '../../auth/public.js'
import type { EmailMessage } from '../../../integrations/index.js'

const owner: AuthIdentity = { id: 'owner', name: 'Basit', email: 'owner@example.com', teamId: 'team', teamName: 'Worklist team', role: 'owner' }
const task = { id: 'task', listId: 'list', title: 'Review <launch>', dueDate: '2026-11-12', priority: 'High' }
const member = { ...owner, id: 'member', email: 'ayesha@example.com', name: 'Ayesha', emailVerified: true, passwordHash: '' }
const setup = (user: typeof member | null = member, fail = false) => {
    const sent: EmailMessage[] = []
    const invited: string[] = []
    const service = createWorkItemAssignmentService({
        accounts: { findUserByEmail: () => Promise.resolve(user), listTeamMembers: () => Promise.resolve(user ? [user] : []) },
        invitations: { inviteMember: (_actor, email) => { if (fail) return Promise.reject(new Error('SMTP down')); invited.push(email); return Promise.resolve() } },
        emailSender: { send: (message) => { if (fail) return Promise.reject(new Error('SMTP down')); sent.push(message); return Promise.resolve() } },
        webOrigin: 'https://worklist.example'
    })
    return { service, sent, invited }
}

void test('email assignment normalizes identity, displays member name and sends task details', async () => {
    const { service, sent, invited } = setup()
    const assignment = await service.resolve(owner, ' AYESHA@example.com ')
    assert.equal(assignment.assignee, 'Ayesha')
    assert.equal(assignment.assigneeEmail, 'ayesha@example.com')
    assert.equal(assignment.assigneePending, false)
    assert.match(await service.notify(owner, assignment, task), /Assignment email sent/)
    const message = sent[0]
    assert.ok(message)
    assert.equal(message.to, 'ayesha@example.com')
    assert.match(message.html, /Review &lt;launch&gt;/)
    assert.match(message.text, /listId=list/)
    assert.deepEqual(invited, [])
})

void test('new addresses receive invitations, then resolve to their name after joining', async () => {
    const { service, invited, sent } = setup(null)
    const assignment = await service.resolve(owner, 'new@example.com')
    assert.equal(assignment.assigneePending, true)
    await service.notify(owner, assignment, task)
    assert.deepEqual(invited, ['new@example.com'])
    assert.equal(sent.length, 0)
    const joined = setup({ ...member, email: 'new@example.com', name: 'New Member' })
    const [item] = await joined.service.hydrate('team', [{ ...assignment, id: 'task' }])
    assert.ok(item)
    assert.equal(item.assignee, 'New Member')
    assert.equal(item.assigneePending, false)
})

void test('cross-workspace assignment and editor invitations are rejected before persistence', async () => {
    await assert.rejects(setup({ ...member, teamId: 'other' }).service.resolve(owner, member.email), /another workspace/)
    await assert.rejects(setup(null).service.resolve({ ...owner, role: 'editor' }, 'new@example.com'), /owner/)
    await assert.rejects(setup().service.resolve(owner, 'just a name'), /valid assignee email/)
})

void test('email failures keep the saved assignment and explain how to retry', async () => {
    for (const user of [member, null]) {
        const { service } = setup(user, true)
        const assignment = await service.resolve(owner, member.email)
        assert.match(await service.notify(owner, assignment, task), /Task saved, but the email.*could not be sent/)
    }
})

void test('unassigning requires no email delivery and preserves legacy display names', async () => {
    const { service, sent, invited } = setup()
    const assignment = await service.resolve(owner, '')
    assert.equal(assignment.assignee, 'Unassigned')
    await service.notify(owner, assignment, task)
    assert.equal(sent.length + invited.length, 0)
    assert.equal((await service.hydrate('team', [{ assignee: 'Legacy name' }]))[0]?.assignee, 'Legacy name')
})
