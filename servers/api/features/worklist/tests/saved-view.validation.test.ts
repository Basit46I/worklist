import test from 'node:test'
import assert from 'node:assert/strict'
import { createSavedViewSchema } from '../saved-view.validation.js'

const state = {
    search: '',
    statusFilter: 'All',
    sortField: 'dueDate',
    sortDirection: 'asc',
    groupBy: 'Off',
    visibleColumns: ['status', 'priority'],
    filters: [],
    filterLogic: 'AND'
} as const

void test('saved views default to private visibility', () => {
    const result = createSavedViewSchema.parse({ name: '  Open work  ', state })

    assert.equal(result.name, 'Open work')
    assert.equal(result.visibility, 'private')
})

void test('saved views accept an explicit team visibility', () => {
    const result = createSavedViewSchema.parse({ name: 'Team deadlines', visibility: 'team', state })

    assert.equal(result.visibility, 'team')
})

void test('saved views reject duplicate columns and invalid column widths', () => {
    const duplicateColumns = createSavedViewSchema.safeParse({
        name: 'Open work',
        state: { ...state, visibleColumns: ['status', 'status'] }
    })
    const invalidWidth = createSavedViewSchema.safeParse({
        name: 'Open work',
        state: { ...state, columnWidths: { status: 40 } }
    })

    assert.equal(duplicateColumns.success, false)
    assert.equal(invalidWidth.success, false)
})
