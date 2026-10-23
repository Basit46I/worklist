import type { WorkItem, WorkItemPriority } from './model'
import type { WorklistList } from './api'

export type DashboardMetrics = Readonly<{
    total: number
    open: number
    inProgress: number
    dueThisWeek: number
    overdue: number
    completed: number
    statuses: readonly Readonly<{ name: string; count: number }>[]
    priorities: readonly Readonly<{ name: WorkItemPriority; count: number }>[]
    assignees: readonly Readonly<{ name: string; count: number }>[]
    overdueAssignees: readonly Readonly<{ name: string; count: number }>[]
}>

export type DashboardSignals = Readonly<{
    unassigned: readonly WorkItem[]
    approvals: readonly WorkItem[]
    blocked: readonly WorkItem[]
    overBudget: readonly Readonly<{ list: WorklistList; trackedMinutes: number; budgetMinutes: number }>[]
}>

const addDays = (date: string, days: number): string => {
    const value = new Date(`${date}T00:00:00.000Z`)
    value.setUTCDate(value.getUTCDate() + days)
    return value.toISOString().slice(0, 10)
}

export const summarizeDashboardItems = (items: readonly WorkItem[], today: string): DashboardMetrics => {
    const completed = items.filter((item) => item.status === 'Done')
    const open = items.filter((item) => item.status !== 'Done')
    const statuses = new Map<string, number>()
    for (const item of items) statuses.set(item.status, (statuses.get(item.status) ?? 0) + 1)
    const priorities: readonly WorkItemPriority[] = ['High', 'Medium', 'Low']
    const assignees = new Map<string, number>()
    for (const item of open) assignees.set(item.assignee, (assignees.get(item.assignee) ?? 0) + 1)
    const overdueAssignees = new Map<string, number>()
    for (const item of open.filter((candidate) => candidate.dueDate < today))
        overdueAssignees.set(item.assignee, (overdueAssignees.get(item.assignee) ?? 0) + 1)

    return {
        total: items.length,
        open: open.length,
        inProgress: open.filter((item) => item.status.toLocaleLowerCase() === 'in progress').length,
        dueThisWeek: open.filter((item) => item.dueDate >= today && item.dueDate <= addDays(today, 7)).length,
        overdue: open.filter((item) => item.dueDate < today).length,
        completed: completed.length,
        statuses: [...statuses].map(([name, count]) => ({ name, count })),
        priorities: priorities.map((name) => ({ name, count: open.filter((item) => item.priority === name).length })),
        assignees: [...assignees]
            .map(([name, count]) => ({ name, count }))
            .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name)),
        overdueAssignees: [...overdueAssignees]
            .map(([name, count]) => ({ name, count }))
            .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
    }
}

export const summarizeDashboardSignals = (items: readonly WorkItem[], lists: readonly WorklistList[]): DashboardSignals => {
    const openItems = items.filter((item) => item.status !== 'Done')
    const itemsById = new Map(items.map((item) => [item.id, item]))
    const overBudget = lists.flatMap((list) => {
        const budgetMinutes = list.settings.budgetMinutes
        if (!budgetMinutes) return []
        const trackedMinutes = items.filter((item) => item.listId === list.id).reduce((total, item) => total + (item.timeSpentMinutes ?? 0), 0)
        return trackedMinutes > budgetMinutes ? [{ list, trackedMinutes, budgetMinutes }] : []
    })

    return {
        unassigned: openItems.filter((item) => !item.assignee.trim() || item.assignee.toLocaleLowerCase() === 'unassigned'),
        approvals: openItems.filter((item) => item.approvalStatus === 'pending' || item.approvalStatus === 'changes_requested'),
        blocked: openItems.filter((item) => (item.dependsOn ?? []).some((dependencyId) => itemsById.get(dependencyId)?.status !== 'Done')),
        overBudget: overBudget.sort((left, right) => right.trackedMinutes / right.budgetMinutes - left.trackedMinutes / left.budgetMinutes)
    }
}
