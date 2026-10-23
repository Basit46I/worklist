import test from 'node:test'
import assert from 'node:assert/strict'
import { summarizeDashboardItems } from '../dashboard-model.js'
import type { WorkItem } from '../model.js'

const items: readonly WorkItem[] = [
    { id: 'due-today', title: 'Due today', description: '', status: 'To do', priority: 'High', assignee: 'Ayesha', dueDate: '2026-10-16' },
    { id: 'due-week', title: 'Due this week', description: '', status: 'In progress', priority: 'Medium', assignee: 'Ayesha', dueDate: '2026-10-23' },
    { id: 'late', title: 'Overdue', description: '', status: 'In review', priority: 'Low', assignee: 'Sarah', dueDate: '2026-10-15' },
    { id: 'done-late', title: 'Completed', description: '', status: 'Done', priority: 'Low', assignee: 'Sarah', dueDate: '2026-10-01' }
]

void test('dashboard metrics are computed from saved items and exclude completed work from open counts', () => {
    const summary = summarizeDashboardItems(items, '2026-10-16')

    assert.equal(summary.total, 4)
    assert.equal(summary.open, 3)
    assert.equal(summary.dueThisWeek, 2)
    assert.equal(summary.overdue, 1)
    assert.equal(summary.completed, 1)
    assert.deepEqual(summary.statuses, [
        { name: 'To do', count: 1 },
        { name: 'In progress', count: 1 },
        { name: 'In review', count: 1 },
        { name: 'Done', count: 1 }
    ])
    assert.deepEqual(summary.assignees, [
        { name: 'Ayesha', count: 2 },
        { name: 'Sarah', count: 1 }
    ])
})
