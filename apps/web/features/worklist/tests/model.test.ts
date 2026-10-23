import test from 'node:test'
import assert from 'node:assert/strict'
import { filterWorkItems, groupWorkItems, initialWorkItems, sortWorkItems } from '../model.js'

void test('work item filters combine conditions with AND or OR', () => {
    const filters = [
        { field: 'status', operator: 'equals', value: 'Done' },
        { field: 'assignee', operator: 'contains', value: 'Ahmed' }
    ] as const

    assert.deepEqual(filterWorkItems(initialWorkItems, '', 'All', filters, 'AND'), [])
    assert.deepEqual(
        filterWorkItems(initialWorkItems, '', 'All', filters, 'OR').map(({ id }) => id),
        ['WI-103', 'WI-101', 'WI-099', 'WI-098']
    )
})

void test('work item sorting returns an ordered copy without mutating the source', () => {
    const sorted = sortWorkItems(initialWorkItems, 'title', 'asc')

    assert.notEqual(sorted, initialWorkItems)
    assert.equal(sorted[0]?.title, 'Audit empty states')
    assert.equal(initialWorkItems[0]?.title, 'Review onboarding flow')
})

void test('grouping uses stable status order and omits empty groups', () => {
    const groups = groupWorkItems(initialWorkItems, 'status')

    assert.deepEqual(
        groups.map(({ key }) => key),
        ['To do', 'In progress', 'Done']
    )
    assert.equal(
        groups.every(({ items }) => items.length > 0),
        true
    )
})
