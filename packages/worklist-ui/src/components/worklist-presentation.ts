import type { WorkItemColumn, WorkItemPriority } from '../model/index.js'

export const maxBulkSelection = 100

const statusStyles: Readonly<Record<string, string>> = {
    'to do': 'bg-[#eef0ec] text-[#5c675f]',
    'in progress': 'bg-[#e6eef2] text-[#3f6074]',
    'in review': 'bg-[#eaf1e9] text-[#42664a]',
    done: 'bg-[#e3eddf] text-[#3f6a46]',
    completed: 'bg-[#e3eddf] text-[#3f6a46]'
}

export const priorityStyles: Readonly<Record<WorkItemPriority, string>> = {
    Low: 'bg-[#f2f3f1] text-[#69736b]',
    Medium: 'bg-[#edf3e9] text-[#57744d]',
    High: 'bg-[#fbece8] text-[#a44e3e]'
}

const statusDotStyles: Readonly<Record<string, string>> = {
    'to do': 'bg-[#a5aea6]',
    'in progress': 'bg-[#5f8aa3]',
    'in review': 'bg-[#668c70]',
    done: 'bg-[#5a9a68]',
    completed: 'bg-[#5a9a68]'
}

export const statusStyle = (status: string): string => statusStyles[status.toLocaleLowerCase()] ?? 'bg-[#eef0ec] text-[#5c675f]'
export const statusDotStyle = (status: string): string => statusDotStyles[status.toLocaleLowerCase()] ?? 'bg-[#a5aea6]'

export const isCompletedStatus = (status: string): boolean => ['done', 'completed'].includes(status.toLocaleLowerCase())

const localToday = (): string => {
    const now = new Date()
    return `${String(now.getFullYear())}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/** A task is overdue when its due date is before today and it is not completed. */
export const isOverdue = (dueDate: string, status: string): boolean => !isCompletedStatus(status) && dueDate.length > 0 && dueDate < localToday()

export const initialsOf = (name: string): string =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part[0] ?? '')
        .join('')
        .slice(0, 2)
        .toUpperCase()

export const columnLabels: Readonly<Record<WorkItemColumn, string>> = {
    status: 'Status',
    priority: 'Priority',
    assignee: 'Assignee',
    dueDate: 'Due date'
}

export const formatDate = (value: string): string =>
    new Intl.DateTimeFormat('en', {
        month: 'short',
        day: 'numeric'
    }).format(new Date(`${value}T00:00:00`))

export const dateInOneWeek = (): string => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
