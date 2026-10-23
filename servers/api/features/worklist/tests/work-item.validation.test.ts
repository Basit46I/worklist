import test from 'node:test'
import assert from 'node:assert/strict'
import { bulkUpdateWorkItemsSchema, createWorkItemSchema, workItemListQuerySchema } from '../work-item.validation.js'

const itemId = '507f1f77bcf86cd799439011'

void test('work item input trims text and applies safe defaults', () => {
    const result = createWorkItemSchema.parse({ title: '  Prepare release  ', dueDate: '2026-10-14' })

    assert.equal(result.title, 'Prepare release')
    assert.equal(result.description, '')
    assert.equal(result.status, 'To do')
    assert.equal(result.priority, 'Medium')
    assert.equal(result.assignee, 'Unassigned')
    assert.equal(result.dueDate.toISOString(), '2026-10-14T00:00:00.000Z')
})

void test('list query defaults to a bounded first page', () => {
    const result = workItemListQuerySchema.parse({})

    assert.equal(result.limit, 50)
    assert.equal(result.sortField, 'dueDate')
    assert.equal(result.sortDirection, 'asc')
    assert.equal(result.filterLogic, 'AND')
    assert.deepEqual(result.filters, [])
})

void test('list query rejects page sizes above the API maximum', () => {
    assert.equal(workItemListQuerySchema.safeParse({ limit: '101' }).success, false)
})

void test('due-date filters accept UTC calendar dates and reject unsupported operators', () => {
    const valid = workItemListQuerySchema.safeParse({
        filters: JSON.stringify([{ field: 'dueDate', operator: 'after', value: '2026-10-14' }])
    })
    const invalid = workItemListQuerySchema.safeParse({
        filters: JSON.stringify([{ field: 'dueDate', operator: 'contains', value: '2026-10-14' }])
    })

    assert.equal(valid.success, true)
    assert.equal(invalid.success, false)
})

void test('cursor must use the requested sort field and direction', () => {
    const cursor = Buffer.from(
        JSON.stringify({
            value: '2026-10-14',
            id: itemId,
            field: 'title',
            direction: 'asc'
        })
    ).toString('base64url')

    assert.equal(workItemListQuerySchema.safeParse({ cursor }).success, false)
})

void test('bulk updates require unique item IDs and at least one change', () => {
    const duplicateIds = bulkUpdateWorkItemsSchema.safeParse({
        itemIds: [itemId, itemId],
        changes: { status: 'Done' }
    })
    const emptyChanges = bulkUpdateWorkItemsSchema.safeParse({ itemIds: [itemId], changes: {} })

    assert.equal(duplicateIds.success, false)
    assert.equal(emptyChanges.success, false)
})

void test('bulk updates accept due dates and cap selections at 100', () => {
    const valid = bulkUpdateWorkItemsSchema.safeParse({
        itemIds: [itemId],
        changes: { dueDate: '2026-10-14' }
    })
    const oversized = bulkUpdateWorkItemsSchema.safeParse({
        itemIds: Array.from({ length: 101 }, (_value, index) => index.toString(16).padStart(24, '0')),
        changes: { status: 'Done' }
    })

    assert.equal(valid.success, true)
    assert.equal(oversized.success, false)
})
