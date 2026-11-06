import test from 'node:test'
import assert from 'node:assert/strict'
import { summarizeDashboardItems, summarizeDashboardSignals } from '../dashboard-model.js'
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

void test('dashboard signals identify unassigned, blocked, approval, and over-budget open work', () => {
    const pending: WorkItem = { ...items[0]!, id: 'pending', listId: 'list-1', approvalStatus: 'pending', dependsOn: ['late'], timeSpentMinutes: 45 }
    const changes: WorkItem = { ...items[1]!, id: 'changes', listId: 'list-1', approvalStatus: 'changes_requested', dependsOn: ['missing'], assignee: 'Unassigned', timeSpentMinutes: 35 }
    const list = (id: string, budgetMinutes: number) => ({
        id, name: id, description: '', spaceName: '', folderName: '', isDefault: false, archivedAt: null,
        settings: { sortField: 'dueDate' as const, sortDirection: 'asc' as const, groupBy: 'status' as const, visibleColumns: ['status' as const],
            columnWidths: { status: 180, priority: 130, assignee: 180, dueDate: 150 }, statuses: ['To do', 'Done'], budgetMinutes }
    })
    const signals = summarizeDashboardSignals([pending, changes, items[2]!, items[3]!], [list('list-1', 60), list('list-2', 0), list('list-3', 80)])
    assert.deepEqual(signals.unassigned.map(({ id }) => id), ['changes'])
    assert.deepEqual(signals.approvals.map(({ id }) => id), ['pending', 'changes'])
    assert.deepEqual(signals.blocked.map(({ id }) => id), ['pending', 'changes'])
    assert.deepEqual(signals.overBudget.map(({ list: over, trackedMinutes, budgetMinutes }) => ({ id: over.id, trackedMinutes, budgetMinutes })), [
        { id: 'list-1', trackedMinutes: 80, budgetMinutes: 60 }
    ])
    assert.deepEqual(summarizeDashboardSignals([], []).overBudget, [])
})
