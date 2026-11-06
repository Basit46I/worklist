import assert from 'node:assert/strict'
import test from 'node:test'
import { Types } from '../../../integrations/index.js'
import { WorkItemModel } from '../work-item.model.js'
import { createWorkItemQueryRepository } from '../work-item.query.repository.js'
import type { WorkItemListQuery } from '../work-item.validation.js'

/* eslint-disable @typescript-eslint/require-await -- model query fakes retain mongoose's promise contract. */

const id = '6ad88dc926697648475ad00e'
const otherId = '6ad88dc926697648475ad011'
const query = (value: unknown) => { const chain = { select: () => chain, sort: () => chain, limit: () => chain, lean: () => chain, exec: async () => value }; return chain }
const stub = (target: object, key: string, value: unknown): (() => void) => {
    const original = Object.getOwnPropertyDescriptor(target, key)
    Object.defineProperty(target, key, { configurable: true, writable: true, value })
    return () => original ? Object.defineProperty(target, key, original) : Reflect.deleteProperty(target, key)
}
const withStubs = async (stubs: Array<() => void>, run: () => Promise<void>) => { try { await run() } finally { stubs.reverse().forEach((restore) => { restore(); }) } }
const stored = (overrides: Record<string, unknown> = {}) => ({
    _id: new Types.ObjectId(id), listId: new Types.ObjectId(otherId), title: 'Ship', description: 'Launch', status: 'To do', priority: 'High', assignee: 'Ayesha',
    dueDate: new Date('2026-11-15T00:00:00.000Z'), ...overrides
})
const baseQuery = (changes: Partial<WorkItemListQuery> = {}): WorkItemListQuery => ({
    listId: otherId, includeArchived: false, search: '', status: 'All', sortField: 'dueDate', sortDirection: 'asc', filterLogic: 'AND', filters: [], limit: 50, ...changes
})

void test('query repository reads item projections, dependency state, recurring date rules, and duplicate-series conflicts', async () => {
    let itemResult: unknown = null
    let existsResult: unknown = null
    let source: Record<string, unknown> | null = null
    let createdInput: Record<string, unknown> | undefined
    let createError: (Error & { code?: number }) | undefined
    const stubs = [
        stub(WorkItemModel, 'findOne', () => query(itemResult ?? source)),
        stub(WorkItemModel, 'exists', () => query(existsResult)),
        stub(WorkItemModel, 'distinct', () => query(['To do'])),
        stub(WorkItemModel, 'create', async (input: unknown) => { createdInput = input as Record<string, unknown>; if (createError) throw createError; return stored(createdInput) })
    ]
    await withStubs(stubs, async () => {
        const repository = createWorkItemQueryRepository()
        assert.equal(await repository.find('team-1', 'bad-id'), null)
        itemResult = stored({ startDate: undefined, dependsOn: [new Types.ObjectId(otherId)] })
        const found = await repository.find('team-1', id)
        assert.deepEqual(found, { listId: otherId, startDate: '2026-11-15', dueDate: '2026-11-15', status: 'To do', dependsOn: [otherId], approvalStatus: 'not_requested', approvalFeedback: '', timeSpentMinutes: 0, updatedAt: undefined })
        assert.equal(await repository.dependenciesComplete('team-1', []), true)
        assert.equal(await repository.dependenciesComplete('team-1', [otherId]), true)
        existsResult = { _id: otherId }
        assert.equal(await repository.dependenciesComplete('team-1', [otherId]), false)
        assert.equal(await repository.canUseAsParent('team-1', otherId, 'bad-id'), false)
        assert.equal(await repository.canUseAsParent('team-1', otherId, id), true)
        assert.deepEqual(await repository.usedStatuses('team-1', otherId), ['To do'])

        itemResult = null
        assert.equal(await repository.createNextRecurring('team-1', 'user-1', 'bad-id', 'To do'), null)
        source = { ...stored({ dueDate: new Date('2026-01-31T00:00:00.000Z'), recurrence: { frequency: 'monthly', interval: 1 }, checklist: [{ id: 'check-1', text: 'Review', completed: true }] }), recurrenceSeriesId: undefined }
        const next = await repository.createNextRecurring('team-1', 'user-1', id, 'Ready')
        assert.equal(next?.dueDate, '2026-02-28')
        assert.ok(createdInput)
        const checklist = createdInput.checklist as Array<{ completed: boolean }>
        assert.equal(checklist[0]?.completed, false)
        assert.equal(createdInput.status, 'Ready')
        source = { ...stored({ dueDate: new Date('2026-11-15T00:00:00.000Z'), recurrence: { frequency: 'weekly', interval: 2 } }) }
        await repository.createNextRecurring('team-1', 'user-1', id, 'To do')
        assert.ok(createdInput)
        assert.equal((createdInput.dueDate as Date).toISOString().slice(0, 10), '2026-11-29')
        source = { ...stored({ recurrence: null }) }
        assert.equal(await repository.createNextRecurring('team-1', 'user-1', id, 'To do'), null)
        source = { ...stored({ recurrence: { frequency: 'daily', interval: 1 } }) }
        createError = Object.assign(new Error('duplicate recurring task'), { code: 11000 })
        assert.equal(await repository.createNextRecurring('team-1', 'user-1', id, 'To do'), null)
        createError = new Error('write failed')
        await assert.rejects(repository.createNextRecurring('team-1', 'user-1', id, 'To do'), /write failed/)
    })
})

void test('dependency validation rejects self, invalid, missing, and cyclic references while allowing valid DAGs', async () => {
    let matching: Array<{ _id: Types.ObjectId; dependsOn?: Types.ObjectId[] }> = []
    let batches: Array<Array<{ _id: Types.ObjectId; dependsOn?: Types.ObjectId[] }>> = []
    let call = 0
    const stubs = [
        stub(WorkItemModel, 'find', () => query(call++ === 0 ? matching : batches.shift() ?? []))
    ]
    await withStubs(stubs, async () => {
        const repository = createWorkItemQueryRepository()
        assert.equal(await repository.canUseDependencies('team-1', otherId, id, []), true)
        assert.equal(await repository.canUseDependencies('team-1', otherId, id, [id]), false)
        assert.equal(await repository.canUseDependencies('team-1', otherId, id, ['bad-id']), false)
        matching = []
        call = 0
        assert.equal(await repository.canUseDependencies('team-1', otherId, id, [otherId]), false)
        matching = [{ _id: new Types.ObjectId(otherId), dependsOn: [] }]
        call = 0
        assert.equal(await repository.canUseDependencies('team-1', otherId, undefined, [otherId]), true)
        matching = [{ _id: new Types.ObjectId(otherId), dependsOn: [new Types.ObjectId(id)] }]
        call = 0
        assert.equal(await repository.canUseDependencies('team-1', otherId, id, [otherId]), false)
        matching = [{ _id: new Types.ObjectId(otherId), dependsOn: [new Types.ObjectId('6ad88dc926697648475ad022')] }]
        batches = [[]]
        call = 0
        assert.equal(await repository.canUseDependencies('team-1', otherId, id, [otherId]), true)
    })
})

void test('work item listing composes search, date/filter logic, cursor ordering, and paginated serialization', async () => {
    let filter: Record<string, unknown> | undefined
    let sort: unknown
    let limit: number | undefined
    const records = [stored({ dueDate: new Date('2026-11-12T00:00:00.000Z') }), stored({ _id: new Types.ObjectId(otherId), dueDate: new Date('2026-11-13T00:00:00.000Z') })]
    const stubs = [stub(WorkItemModel, 'find', (value: Record<string, unknown>) => { filter = value; const chain = { sort: (value: unknown) => { sort = value; return chain }, limit: (value: number) => { limit = value; return chain }, lean: () => chain, exec: async () => records }; return chain })]
    await withStubs(stubs, async () => {
        const repository = createWorkItemQueryRepository()
        const result = await repository.list('team-1', baseQuery({ search: '2026-11-12', status: 'In progress', includeArchived: true, filterLogic: 'OR',
            filters: [
                { field: 'assignee', operator: 'contains', value: 'ship.*' },
                { field: 'dueDate', operator: 'before', value: '2026-11-20' },
                { field: 'dueDate', operator: 'after', value: '2026-11-01' },
                { field: 'dueDate', operator: 'equals', value: '2026-11-12' },
                { field: 'priority', operator: 'equals', value: 'High' }
            ], cursor: { value: '2026-11-10', id: otherId, field: 'dueDate', direction: 'asc' }, limit: 1 }))
        assert.equal(limit, 2)
        assert.deepEqual(sort, { dueDate: 1, _id: 1 })
        assert.deepEqual(filter?.archivedAt, { $ne: null })
        const clauses = filter.$and as Array<Record<string, unknown>>
        assert.equal(clauses.length, 4)
        assert.match(JSON.stringify(clauses), /dueDate/)
        assert.doesNotMatch(JSON.stringify(clauses), /ship\.\*/)
        assert.equal(result.items.length, 1)
        const cursor = JSON.parse(Buffer.from(result.nextCursor ?? '', 'base64url').toString()) as { value: string; field: string; direction: string }
        assert.deepEqual(cursor, { value: '2026-11-12', id, field: 'dueDate', direction: 'asc' })
    })
})
