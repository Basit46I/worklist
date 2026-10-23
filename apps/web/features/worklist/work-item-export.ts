import type { WorkItem } from './model'

const escapeCsvCell = (value: string): string => {
    const safeValue = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value
    return `"${safeValue.replaceAll('"', '""')}"`
}

export const workItemsToCsv = (items: readonly WorkItem[]): string => {
    const header = ['Task', 'Description', 'Status', 'Priority', 'Assignee', 'Due date', 'Labels']
    const rows = items.map((item) => [item.title, item.description, item.status, item.priority, item.assignee, item.dueDate, (item.tags ?? []).join(', ')])
    return [header, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')
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
