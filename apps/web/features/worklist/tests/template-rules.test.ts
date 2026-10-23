import assert from 'node:assert/strict'
import test from 'node:test'
import { buildTemplateInput } from '../template-rules.js'
import type { WorklistTemplate } from '../api.js'

void test('template input trims text, removes duplicate statuses, and allows no starter tasks', () => {
    const result = buildTemplateInput('  Launch  ', '  Release workflow  ', 'To do\n In progress \nTo do\nDone', '\n  ')

    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.deepEqual(result.input, { name: 'Launch', description: 'Release workflow', statuses: ['To do', 'In progress', 'Done'], tasks: [] })
})

void test('template input rejects fewer than two unique statuses and more than twelve', () => {
    assert.deepEqual(buildTemplateInput('Plan', '', 'To do\nTo do', ''), { ok: false, error: 'A template needs 2 to 12 unique statuses.' })
    const statuses = Array.from({ length: 13 }, (_, index) => `Status ${index + 1}`).join('\n')
    assert.deepEqual(buildTemplateInput('Plan', '', statuses, ''), { ok: false, error: 'A template needs 2 to 12 unique statuses.' })
})

void test('template input rejects more than fifty nonblank starter tasks', () => {
    const tasks = Array.from({ length: 51 }, (_, index) => `Task ${index + 1}`).join('\n')
    assert.deepEqual(buildTemplateInput('Plan', '', 'To do\nDone', tasks), { ok: false, error: 'A template can contain up to 50 starter tasks.' })
})

void test('editing keeps task settings when its status remains and safely falls back when it was removed', () => {
    const previous: WorklistTemplate = {
        id: 'template-1', name: 'Old', description: '', statuses: ['To do', 'Review'],
        tasks: [
            { title: 'First', description: 'Details', status: 'Review', priority: 'High', dueDateOffsetDays: 12 },
            { title: 'Second', description: '', status: 'Review', priority: 'Low', dueDateOffsetDays: 20 }
        ]
    }
    const result = buildTemplateInput('New', '', 'To do\nDone', 'First updated\nSecond', previous)

    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.deepEqual(result.input.tasks, [
        { title: 'First updated', description: 'Details', status: 'To do', priority: 'High', dueDateOffsetDays: 12 },
        { title: 'Second', description: '', status: 'To do', priority: 'Low', dueDateOffsetDays: 20 }
    ])
})

void test('new tasks receive the first status, medium priority, and bounded day offsets', () => {
    const result = buildTemplateInput('Plan', '', 'Ready\nDone', 'One\nTwo\nThree')

    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.deepEqual(result.input.tasks, [
        { title: 'One', description: '', status: 'Ready', priority: 'Medium', dueDateOffsetDays: 1 },
        { title: 'Two', description: '', status: 'Ready', priority: 'Medium', dueDateOffsetDays: 2 },
        { title: 'Three', description: '', status: 'Ready', priority: 'Medium', dueDateOffsetDays: 3 }
    ])
})
