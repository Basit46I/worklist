import type { WorkItem } from './model'
import { z } from 'zod'

const backupItemSchema = z.object({
    id: z.string().min(1), listId: z.string().optional(), parentId: z.string().nullable().optional(),
    title: z.string().trim().min(1).max(200), description: z.string().max(2000).default(''), status: z.string().trim().min(1).max(40),
    priority: z.enum(['Low', 'Medium', 'High']), assignee: z.string().max(120), startDate: z.iso.date().optional(), dueDate: z.iso.date(),
    checklist: z.array(z.object({ id: z.string().min(1), text: z.string().trim().min(1).max(240), completed: z.boolean() })).max(100).default([]),
    dependsOn: z.array(z.string().min(1)).max(100).default([]),
    recurrence: z.object({ frequency: z.enum(['daily', 'weekly', 'monthly']), interval: z.number().int().min(1).max(52) }).nullable().default(null),
    tags: z.array(z.string().trim().min(1).max(32)).max(20).default([]), archivedAt: z.string().nullable().optional(),
    clientRequest: z.object({ contactName: z.string(), contactEmail: z.email(), request: z.string() }).nullable().optional(),
    approvalStatus: z.enum(['not_requested', 'pending', 'approved', 'changes_requested']).optional(), approvalFeedback: z.string().optional(),
    timeSpentMinutes: z.number().int().min(0).max(10_000_000).default(0)
})

export const parseWorkItemsBackup = (source: string): readonly WorkItem[] => {
    let parsed: unknown
    try { parsed = JSON.parse(source) } catch { throw new Error('This file is not valid JSON.') }
    const backup = z.object({ format: z.literal('worklist-task-backup'), version: z.literal(1), exportedAt: z.iso.datetime(), items: z.array(backupItemSchema).max(10_000) }).safeParse(parsed)
    if (!backup.success) throw new Error('This is not a supported Worklist backup file or its data is invalid.')
    const ids = new Set(backup.data.items.map((item) => item.id))
    if (ids.size !== backup.data.items.length) throw new Error('The backup contains duplicate task IDs.')
    for (const item of backup.data.items) {
        if ((item.parentId && !ids.has(item.parentId)) || item.dependsOn.some((id) => !ids.has(id))) throw new Error(`Task “${item.title}” refers to a task missing from this backup.`)
    }
    return backup.data.items as readonly WorkItem[]
}

const escapeCsvCell = (value: string): string => {
    const safeValue = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value
    return `"${safeValue.replaceAll('"', '""')}"`
}

export const workItemsToCsv = (items: readonly WorkItem[]): string => {
    const header = ['Task', 'Description', 'Status', 'Priority', 'Assignee', 'Due date', 'Labels']
    const rows = items.map((item) => [item.title, item.description, item.status, item.priority, item.assignee, item.dueDate, (item.tags ?? []).join(', ')])
    return [header, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')
}

export const parseWorkItemsCsv = (source: string): readonly Omit<WorkItem, 'id'>[] => {
    const rows: string[][] = []
    let row: string[] = []
    let cell = ''
    let quoted = false
    for (let index = 0; index < source.length; index += 1) {
        const character = source[index] ?? ''
        if (character === '"' && quoted && source[index + 1] === '"') { cell += '"'; index += 1 }
        else if (character === '"') quoted = !quoted
        else if (character === ',' && !quoted) { row.push(cell); cell = '' }
        else if ((character === '\n' || character === '\r') && !quoted) {
            if (character === '\r' && source[index + 1] === '\n') index += 1
            row.push(cell); if (row.some((value) => value.trim())) rows.push(row); row = []; cell = ''
        } else cell += character
    }
    if (quoted) throw new Error('The CSV has an unfinished quoted field.')
    row.push(cell); if (row.some((value) => value.trim())) rows.push(row)
    if (rows.length < 2) throw new Error('The CSV needs a header and at least one task row.')
    const headers = (rows.shift() ?? []).map((value) => value.replace(/^\uFEFF/, '').trim().toLocaleLowerCase())
    const column = (name: string): number => headers.indexOf(name.toLocaleLowerCase())
    if (column('task') < 0 || column('due date') < 0) throw new Error('CSV headers must include Task and Due date.')
    if (rows.length > 100) throw new Error('Import is limited to 100 tasks at a time.')
    return rows.map((values, index) => {
        const value = (name: string, fallback = ''): string => values[column(name)]?.trim() ?? fallback
        const title = value('Task')
        const dueDate = value('Due date')
        const parsedDate = new Date(`${dueDate}T00:00:00.000Z`)
        if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || Number.isNaN(parsedDate.valueOf()) || parsedDate.toISOString().slice(0, 10) !== dueDate) {
            throw new Error(`Row ${index + 2} needs a task title and due date in YYYY-MM-DD format.`)
        }
        const requestedPriority = value('Priority')
        const priority = ['Low', 'Medium', 'High'].includes(requestedPriority) ? requestedPriority as WorkItem['priority'] : 'Medium'
        return {
            title, description: value('Description'), status: value('Status', 'To do'), priority,
            assignee: value('Assignee', 'Unassigned') || 'Unassigned', dueDate,
            tags: value('Labels').split(',').map((tag) => tag.trim()).filter(Boolean)
        }
    })
}

export const downloadWorkItemsCsv = (items: readonly WorkItem[]): void => {
    const blob = new Blob([`\uFEFF${workItemsToCsv(items)}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `worklist-tasks-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

export const downloadWorkItemsBackup = (items: readonly WorkItem[]): void => {
    const backup = { format: 'worklist-task-backup', version: 1, exportedAt: new Date().toISOString(), items }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `worklist-backup-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}
