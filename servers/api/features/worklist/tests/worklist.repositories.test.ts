import assert from 'node:assert/strict'
import test from 'node:test'
import { WorklistFolderModel } from '../worklist-folder.model.js'
import { WorklistSpaceModel } from '../worklist-space.model.js'
import { WorklistTemplateModel } from '../worklist-template.model.js'
import { WorkItemModel } from '../work-item.model.js'

/* eslint-disable @typescript-eslint/require-await -- model query fakes retain mongoose's promise contract. */
import { SavedViewModel } from '../saved-view.model.js'
import { createWorklistHierarchyRepository } from '../worklist-hierarchy.repository.js'
import { createWorklistTemplateRepository } from '../worklist-template.repository.js'
import { createSavedViewRepository } from '../saved-view.repository.js'
import { createClientApprovalRepository } from '../client-approval.repository.js'

const id = '6ad88dc926697648475ad00e'
const query = (value: unknown) => { const chain = { select: () => chain, sort: () => chain, lean: () => chain, exec: async () => value }; return chain }
const stub = (target: object, key: string, value: unknown): (() => void) => {
    const original = Object.getOwnPropertyDescriptor(target, key)
    Object.defineProperty(target, key, { configurable: true, writable: true, value })
    return () => original ? Object.defineProperty(target, key, original) : Reflect.deleteProperty(target, key)
}
const withStubs = async (stubs: Array<() => void>, run: () => Promise<void>) => { try { await run() } finally { stubs.reverse().forEach((restore) => { restore(); }) } }
const template = { _id: id, name: 'Launch', description: '', statuses: ['To do', 'Done'], tasks: [] }
const savedView = { _id: { toString: () => id }, userId: { toString: () => 'user-1' }, name: 'My view', visibility: 'private', state: { status: 'All' } }

void test('hierarchy repository resolves normalized spaces/folders and enforces team and active-space boundaries', async () => {
    const calls: Array<{ model: string; args: unknown[] }> = []
    const stubs = [
        stub(WorklistSpaceModel, 'findOneAndUpdate', (...args: unknown[]) => { calls.push({ model: 'space-upsert', args }); return query({ _id: id, name: 'General' }) }),
        stub(WorklistFolderModel, 'findOneAndUpdate', (...args: unknown[]) => { calls.push({ model: 'folder-upsert', args }); return query({ _id: id, name: 'Sprint', spaceId: id }) }),
        stub(WorklistSpaceModel, 'find', () => query([{ _id: id, name: 'Product', description: '', archivedAt: null }])),
        stub(WorklistSpaceModel, 'create', async (input: unknown) => ({ _id: id, ...(input as object) })),
        stub(WorklistSpaceModel, 'exists', () => query({ _id: id })),
        stub(WorklistFolderModel, 'find', () => query([{ _id: id, spaceId: id, name: 'Sprint' }])),
        stub(WorklistFolderModel, 'create', async (input: unknown) => ({ _id: id, ...(input as object) }))
    ]
    await withStubs(stubs, async () => {
        const repository = createWorklistHierarchyRepository()
        assert.deepEqual(await repository.resolveLocation('team-1', 'user-1', ' ', ' '), { spaceId: id, folderId: null, spaceName: 'General', folderName: '' })
        assert.deepEqual(await repository.resolveLocation('team-1', 'user-1', ' Product ', ' Sprint '), { spaceId: id, folderId: id, spaceName: 'General', folderName: 'Sprint' })
        assert.equal(calls[0]?.args[0] && JSON.stringify(calls[0].args[0]).includes('general'), true)
        assert.deepEqual((await repository.listSpaces('team-1'))[0], { id, name: 'Product', description: '', archivedAt: null })
        assert.equal((await repository.createSpace('team-1', 'user-1', ' Studio ', 'Design')).name, 'Studio')
        assert.equal(await repository.listFolders('team-1', 'bad-id'), null)
        const noSpace = stub(WorklistSpaceModel, 'exists', () => query(null))
        assert.equal(await repository.listFolders('team-1', id), null)
        assert.equal(await repository.createFolder('team-1', 'user-1', id, 'Sprint'), null)
        noSpace()
        assert.deepEqual(await repository.listFolders('team-1', id), [{ id, spaceId: id, name: 'Sprint', archivedAt: null }])
        assert.equal(await repository.createFolder('team-1', 'user-1', 'bad-id', 'Sprint'), null)
        assert.equal((await repository.createFolder('team-1', 'user-1', id, ' Sprint '))?.name, 'Sprint')
    })
})

void test('template repository serializes list/create/update and reports invalid or missing records', async () => {
    let findResult: unknown = [template]
    let updateResult: unknown = null
    let deletedCount = 0
    const stubs = [
        stub(WorklistTemplateModel, 'find', () => query(findResult)),
        stub(WorklistTemplateModel, 'create', async (input: unknown) => ({ _id: id, ...(input as object) })),
        stub(WorklistTemplateModel, 'findOneAndUpdate', () => query(updateResult)),
        stub(WorklistTemplateModel, 'deleteOne', () => query({ deletedCount }))
    ]
    await withStubs(stubs, async () => {
        const repository = createWorklistTemplateRepository()
        assert.deepEqual(await repository.list('team-1'), [{ id, name: 'Launch', description: '', statuses: ['To do', 'Done'], tasks: [] }])
        const input = { name: 'Release', description: 'Ship', statuses: ['Ready'], tasks: [] }
        assert.equal((await repository.create('team-1', 'user-1', input)).name, 'Release')
        assert.equal(await repository.update('team-1', 'bad-id', input), null)
        assert.equal(await repository.update('team-1', id, input), null)
        updateResult = { ...template, name: 'Release' }
        assert.equal((await repository.update('team-1', id, input))?.name, 'Release')
        assert.equal(await repository.delete('team-1', 'bad-id'), false)
        assert.equal(await repository.delete('team-1', id), false)
        deletedCount = 1
        assert.equal(await repository.delete('team-1', id), true)
        findResult = []
        assert.deepEqual(await repository.list('team-1'), [])
    })
})

void test('saved-view repository limits visibility to owner/team and scopes mutations to their creator', async () => {
    let updateResult: unknown = null
    let deletedCount = 0
    const stubs = [
        stub(SavedViewModel, 'find', () => query([savedView, { ...savedView, _id: { toString: () => 'another' }, userId: { toString: () => 'other' }, visibility: 'team' }])),
        stub(SavedViewModel, 'create', async (input: unknown) => ({ _id: { toString: () => id }, ...(input as object) })),
        stub(SavedViewModel, 'findOneAndUpdate', () => query(updateResult)),
        stub(SavedViewModel, 'deleteOne', () => query({ deletedCount }))
    ]
    await withStubs(stubs, async () => {
        const repository = createSavedViewRepository()
        const views = await repository.list('team-1', 'user-1')
        assert.equal(views[0]?.canManage, true)
        assert.equal(views[1]?.canManage, false)
        assert.equal((await repository.create('team-1', 'user-1', 'My view', { status: 'All' } as never, 'private')).canManage, true)
        assert.equal(await repository.update('team-1', 'user-1', 'bad-id', 'Next', {} as never, 'team'), null)
        assert.equal(await repository.update('team-1', 'user-1', id, 'Next', {} as never, 'team'), null)
        updateResult = { ...savedView, name: 'Next', visibility: 'team' }
        assert.equal((await repository.update('team-1', 'user-1', id, 'Next', {} as never, 'team'))?.visibility, 'team')
        assert.equal(await repository.delete('team-1', 'user-1', 'bad-id'), false)
        assert.equal(await repository.delete('team-1', 'user-1', id), false)
        deletedCount = 1
        assert.equal(await repository.delete('team-1', 'user-1', id), true)
    })
})

void test('client approval repository hashes tokens and handles invalid, expired, and resolved decisions', async () => {
    let findOneResult: unknown = null
    let updateResult: unknown = null
    const updates: unknown[] = []
    const stubs = [
        stub(WorkItemModel, 'findOneAndUpdate', (filter: unknown, update: unknown) => { updates.push({ filter, update }); return query(updateResult) }),
        stub(WorkItemModel, 'updateOne', (filter: unknown, update: unknown) => { updates.push({ filter, update }); return query({ modifiedCount: 1 }) }),
        stub(WorkItemModel, 'findOne', (filter: unknown) => { updates.push(filter); return query(findOneResult) })
    ]
    await withStubs(stubs, async () => {
        const repository = createClientApprovalRepository()
        const token = 'opaque_token_' + 'x'.repeat(32)
        const expiry = new Date('2026-12-01T00:00:00.000Z')
        assert.equal(await repository.request('team-1', 'bad-id', token, expiry), null)
        updateResult = { _id: id, title: 'Approval', description: '', clientRequest: { contactEmail: 'client@example.test', contactName: '' }, createdBy: 'user-1', teamId: 'team-1' }
        assert.equal((await repository.request('team-1', id, token, expiry))?.email, 'client@example.test')
        assert.equal(JSON.stringify(updates.at(-1)).includes(token), false)
        await repository.revoke('bad-id', token)
        await repository.revoke(id, token)
        assert.equal(await repository.findByToken('short'), null)
        findOneResult = { _id: id, title: 'Approval', description: '', clientRequest: {}, createdBy: 'user-1', teamId: 'team-1' }
        assert.equal((await repository.findByToken(token))?.contactName, 'Client')
        assert.equal(await repository.decide('short', 'approved', ''), null)
        updateResult = null
        assert.equal(await repository.decide(token, 'changes_requested', 'Please revise'), null)
        updateResult = { _id: id, title: 'Approval', clientRequest: { contactEmail: 'client@example.test' }, createdBy: 'user-1', teamId: 'team-1' }
        assert.equal((await repository.decide(token, 'approved', 'Looks good'))?.contactEmail, 'client@example.test')
    })
})
