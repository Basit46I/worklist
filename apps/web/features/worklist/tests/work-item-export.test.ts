import test from 'node:test'
import assert from 'node:assert/strict'
import { parseWorkItemsBackup, parseWorkItemsCsv, workItemsToCsv } from '../work-item-export'
import type { WorkItem } from '../model'

const item: WorkItem = {
    id: 'task-1', listId: 'list-1', parentId: null, title: 'Prepare, then review', description: 'Say "hello"', status: 'In progress',
    priority: 'High', assignee: 'A teammate', startDate: '2026-10-01', dueDate: '2026-10-02', checklist: [{ id: 'check-1', text: 'Verify input', completed: false }],
    dependsOn: [], recurrence: null, tags: ['launch']
}

void test('CSV export can be imported without losing commas, quotes, or task fields', () => {
    const csv = workItemsToCsv([item])
    const [restored] = parseWorkItemsCsv(csv)
    assert.equal(restored?.title, item.title)
    assert.equal(restored?.description, item.description)
    assert.equal(restored?.status, item.status)
    assert.equal(restored?.priority, item.priority)
    assert.equal(restored?.assignee, item.assignee)
    assert.equal(restored?.dueDate, item.dueDate)
    assert.deepEqual(restored?.tags, item.tags)
})

void test('JSON backup parsing keeps supported task data and validates task relationships', () => {
    const child: WorkItem = { ...item, id: 'task-2', parentId: item.id, dependsOn: [item.id] }
    const source = JSON.stringify({ format: 'worklist-task-backup', version: 1, exportedAt: new Date().toISOString(), items: [item, child] })
    const restored = parseWorkItemsBackup(source)
    assert.equal(restored.length, 2)
    assert.equal(restored[1]?.parentId, item.id)
    assert.deepEqual(restored[1]?.dependsOn, [item.id])
    assert.deepEqual(restored[0]?.checklist, item.checklist)
})

void test('JSON backup rejects unsupported formats, duplicate IDs, and missing references', () => {
    const envelope = (items: readonly WorkItem[], version = 1) => JSON.stringify({ format: 'worklist-task-backup', version, exportedAt: new Date().toISOString(), items })
    assert.throws(() => parseWorkItemsBackup('{'), /valid JSON/)
    assert.throws(() => parseWorkItemsBackup(envelope([item], 2)), /supported Worklist backup/)
    assert.throws(() => parseWorkItemsBackup(envelope([item, item])), /duplicate task IDs/)
    assert.throws(() => parseWorkItemsBackup(envelope([{ ...item, parentId: 'missing' }])), /refers to a task missing/)
})
