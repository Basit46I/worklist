import assert from 'node:assert/strict'
import test from 'node:test'
import { WorkItemModel } from '../work-item.model.js'
import { createWorklistListRepository } from '../worklist-list.repository.js'
import { WorklistListModel } from '../worklist-list.model.js'

/* eslint-disable @typescript-eslint/require-await -- query and persistence fakes preserve the repository promise contract. */

const id = '6ad88dc926697648475ad00e'
const settings = { sortField: 'dueDate', sortDirection: 'asc', groupBy: 'status', visibleColumns: ['status'], columnWidths: { status: 150, priority: 120, assignee: 180, dueDate: 140 }, statuses: ['Ready', 'Done'], budgetMinutes: 90 } as const
const record = (overrides: Record<string, unknown> = {}) => ({
    _id: id, name: 'Launch', description: 'Ship it', spaceName: 'Product', folderName: 'Releases', spaceId: id, folderId: id,
    isDefault: false, archivedAt: null, requestFormTokenHash: null, settings, ...overrides
})
const query = (value: unknown) => {
    const chain = { select: () => chain, sort: () => chain, lean: () => chain, exec: async () => value }
    return chain
}
const stub = (target: object, key: string, value: unknown): (() => void) => {
    const original = Object.getOwnPropertyDescriptor(target, key)
    Object.defineProperty(target, key, { configurable: true, writable: true, value })
    return () => original ? Object.defineProperty(target, key, original) : Reflect.deleteProperty(target, key)
}
const withStubs = async (stubs: Array<() => void>, run: () => Promise<void>) => {
    try { await run() } finally { stubs.reverse().forEach((restore) => { restore(); }) }
}

void test('default list creation migrates legacy unassigned work items and serializes optional location fields', async () => {
    let listFilter: unknown
    let migrationFilter: unknown
    await withStubs([
        stub(WorklistListModel, 'findOneAndUpdate', (filter: unknown, _update: unknown, options: unknown) => {
            listFilter = { filter, options }
            return query(record({ spaceName: 'Product', spaceId: id, folderId: undefined, requestFormTokenHash: 'hidden-hash' }))
        }),
        stub(WorkItemModel, 'updateMany', (filter: unknown) => { migrationFilter = filter; return query({ modifiedCount: 2 }) })
    ], async () => {
        const result = await createWorklistListRepository().ensureDefault('team-1', 'user-1', { spaceId: id, spaceName: 'Product' })
        assert.deepEqual(listFilter, { filter: { teamId: 'team-1', isDefault: true }, options: { upsert: true, new: true, runValidators: true } })
        assert.deepEqual(migrationFilter, { teamId: 'team-1', $or: [{ listId: { $exists: false } }, { listId: null }] })
        assert.equal(result.spaceName, 'Product')
        assert.equal(result.requestFormEnabled, true)
    })
})

void test('list queries distinguish archived records and active-list lookup rejects invalid or missing IDs', async () => {
    const calls: unknown[] = []
    await withStubs([stub(WorklistListModel, 'find', (filter: unknown) => { calls.push(filter); return query([record()]) }),
        stub(WorklistListModel, 'findOne', (filter: unknown) => { calls.push(filter); return query(null) })], async () => {
        const repository = createWorklistListRepository()
        assert.equal((await repository.list('team-1', false)).length, 1)
        assert.equal((await repository.list('team-1', true)).length, 1)
        assert.deepEqual(calls.slice(0, 2), [{ teamId: 'team-1', archivedAt: null }, { teamId: 'team-1' }])
        assert.equal(await repository.findActive('team-1', 'bad-id'), null)
        assert.equal(await repository.findActive('team-1', id), null)
        assert.deepEqual(calls[2], { _id: id, teamId: 'team-1', archivedAt: null })
    })
})

void test('request forms issue opaque tokens, store only a hash, validate public lookup, and revoke safely', async () => {
    let update: unknown
    const stubs = [
        stub(WorklistListModel, 'findOneAndUpdate', (_filter: unknown, value: unknown) => { update = value; return query(record({ requestFormTokenHash: 'stored-hash' })) }),
        stub(WorklistListModel, 'updateOne', () => query({ matchedCount: 1 })),
        stub(WorklistListModel, 'findOne', () => query(record({ teamId: 'team-1', createdBy: 'user-1' })))
    ]
    await withStubs(stubs, async () => {
        const repository = createWorklistListRepository()
        assert.equal(await repository.createRequestForm('team-1', 'bad-id'), null)
        const created = await repository.createRequestForm('team-1', id)
        assert.ok(created?.token)
        assert.equal(created.token.length, 43)
        assert.match(JSON.stringify(update), /requestFormTokenHash/)
        assert.equal(JSON.stringify(update).includes(created.token), false)
        assert.equal(await repository.revokeRequestForm('team-1', 'bad-id'), false)
        assert.equal(await repository.revokeRequestForm('team-1', id), true)
        assert.equal(await repository.findByRequestFormToken('bad'), null)
        const publicList = await repository.findByRequestFormToken(created.token)
        assert.deepEqual(publicList, { id, teamId: 'team-1', createdBy: 'user-1', name: 'Launch', description: 'Ship it', initialStatus: 'Ready' })
    })
})

void test('list create, update, duplicate, archive, and deletion cover validation and missing-record outcomes', async () => {
    const creates: unknown[] = []
    const updates: unknown[] = []
    let findOneResult: unknown = record()
    let updateResult: unknown = record()
    let existsResult: unknown = null
    const stubs = [
        stub(WorklistListModel, 'create', async (input: unknown) => { creates.push(input); return record(input as Record<string, unknown>) }),
        stub(WorklistListModel, 'findOneAndUpdate', (filter: unknown, update: unknown) => { updates.push({ filter, update }); return query(updateResult) }),
        stub(WorklistListModel, 'findOne', () => query(findOneResult)),
        stub(WorklistListModel, 'deleteOne', () => query({ deletedCount: 1 })),
        stub(WorkItemModel, 'exists', () => query(existsResult))
    ]
    await withStubs(stubs, async () => {
        const repository = createWorklistListRepository()
        const created = await repository.create('team-1', 'user-1', '  Release  ')
        assert.equal(created.name, 'Release')
        assert.equal((creates[0] as { name: string }).name, 'Release')
        await repository.create('team-1', 'user-1', 'Sprint', 'Details', 'Product', 'Week 1', ['Ready'], { spaceId: id, folderId: id })

        assert.equal(await repository.update('team-1', 'bad-id', {}), null)
        const updated = await repository.update('team-1', id, { name: ' Next ', description: ' Details ', spaceName: ' Product ', folderName: ' Sprint ', spaceId: id, folderId: null, settings })
        assert.equal(updated?.id, id)
        const set = (updates.at(-1) as { update: { $set: Record<string, unknown> } }).update.$set
        assert.deepEqual(set, { name: 'Next', nameKey: 'next', description: 'Details', spaceName: 'Product', folderName: 'Sprint', spaceId: id, folderId: null, settings })

        assert.equal(await repository.duplicate('team-1', 'user-1', 'bad-id', 'Copy'), null)
        findOneResult = null
        assert.equal(await repository.duplicate('team-1', 'user-1', id, 'Copy'), null)
        findOneResult = record()
        assert.equal((await repository.duplicate('team-1', 'user-1', id, ' Copy '))?.id, id)

        assert.equal(await repository.setArchived('team-1', 'bad-id', true), null)
        updateResult = null
        assert.equal(await repository.setArchived('team-1', id, true), null)
        updateResult = record({ archivedAt: new Date('2026-11-01T00:00:00.000Z') })
        assert.equal((await repository.setArchived('team-1', id, true))?.archivedAt, '2026-11-01T00:00:00.000Z')

        assert.equal(await repository.deleteIfEmpty('team-1', 'bad-id'), 'not_found')
        findOneResult = null
        assert.equal(await repository.deleteIfEmpty('team-1', id), 'not_found')
        findOneResult = record()
        existsResult = { _id: id }
        assert.equal(await repository.deleteIfEmpty('team-1', id), 'not_empty')
        existsResult = null
        assert.equal(await repository.deleteIfEmpty('team-1', id), 'deleted')
    })
})
