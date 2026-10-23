export type WorkItemStatus = string
export type WorkItemPriority = 'Low' | 'Medium' | 'High'
export type WorkItemChecklistEntry = Readonly<{ id: string; text: string; completed: boolean }>
export type WorkItemRecurrence = Readonly<{ frequency: 'daily' | 'weekly' | 'monthly'; interval: number }>
export type WorkItemClientRequest = Readonly<{ contactName: string; contactEmail: string; request: string }>
export type WorkItem = Readonly<{
    id: string
    listId?: string
    parentId?: string | null
    title: string
    description: string
    status: WorkItemStatus
    priority: WorkItemPriority
    assignee: string
    startDate?: string
    dueDate: string
    checklist?: readonly WorkItemChecklistEntry[]
    dependsOn?: readonly string[]
    recurrence?: WorkItemRecurrence | null
    tags?: readonly string[]
    archivedAt?: string | null
    clientRequest?: WorkItemClientRequest | null
    approvalStatus?: 'not_requested' | 'pending' | 'approved' | 'changes_requested'
    approvalFeedback?: string
    timeSpentMinutes?: number
}>
export type WorkItemColumn = 'status' | 'priority' | 'assignee' | 'dueDate'
export type WorkItemSortField = 'title' | WorkItemColumn
export type WorkItemColumnWidths = Readonly<Record<WorkItemColumn, number>>
export type WorkItemFilter = Readonly<{
    field: 'status' | 'priority' | 'assignee' | 'dueDate'
    operator: 'equals' | 'contains' | 'before' | 'after'
    value: string
}>
export type WorklistGroup = Readonly<{ key: string; items: readonly WorkItem[] }>
export type WorklistListOption = Readonly<{ id: string; name: string; archivedAt?: string | null }>
export type WorklistComment = Readonly<{ id: string; authorName: string; body: string; createdAt: string }>
export type WorklistCommentClient = Readonly<{
    list: (itemId: string) => Promise<readonly WorklistComment[]>
    create: (itemId: string, body: string) => Promise<WorklistComment>
}>
export type WorkItemActivity = Readonly<{ id: string; actorName: string; action: 'created' | 'updated' | 'commented' | 'deleted' | 'approval_requested' | 'approved' | 'changes_requested' | 'time_logged'; summary: string; createdAt: string }>
export type WorkItemActivityClient = Readonly<{ list: (itemId: string) => Promise<readonly WorkItemActivity[]> }>
export type SavedViewOption = Readonly<{ id: string; name: string; visibility: 'private' | 'team'; canManage?: boolean }>

export const workItemStatuses: readonly WorkItemStatus[] = ['To do', 'In progress', 'Done']
export const defaultWorkItemColumnWidths: WorkItemColumnWidths = Object.freeze({ status: 150, priority: 120, assignee: 180, dueDate: 140 })

export const filterWorkItems = (
    items: readonly WorkItem[],
    search: string,
    status: string,
    filters: readonly WorkItemFilter[] = [],
    filterLogic: 'AND' | 'OR' = 'AND'
): readonly WorkItem[] => {
    const normalizedSearch = search.trim().toLocaleLowerCase()
    return items.filter((item) => {
        const matchesSearch = [item.title, item.description, item.status, item.priority, item.assignee, item.dueDate, ...(item.tags ?? [])].some((value) =>
            value.toLocaleLowerCase().includes(normalizedSearch)
        )
        const matchesStatus = status === 'All' || item.status === status
        const matchesRules =
            filters.length === 0 ||
            (filterLogic === 'AND' ? filters.every((filter) => matchesFilter(item, filter)) : filters.some((filter) => matchesFilter(item, filter)))
        return matchesSearch && matchesStatus && matchesRules
    })
}

const matchesFilter = (item: WorkItem, filter: WorkItemFilter): boolean => {
    const actual = item[filter.field].toLocaleLowerCase()
    const expected = filter.value.trim().toLocaleLowerCase()
    if (filter.operator === 'contains') return actual.includes(expected)
    if (filter.field === 'dueDate' && filter.operator === 'before') return actual < expected
    if (filter.field === 'dueDate' && filter.operator === 'after') return actual > expected
    return actual === expected
}

export const sortWorkItems = (items: readonly WorkItem[], field: WorkItemSortField, direction: 'asc' | 'desc'): readonly WorkItem[] =>
    [...items].sort((left, right) => {
        const comparison = left[field].localeCompare(right[field])
        return direction === 'asc' ? comparison : -comparison
    })

export const groupWorkItems = (
    items: readonly WorkItem[],
    field: WorkItemColumn | 'Off',
    statuses: readonly string[] = workItemStatuses
): readonly WorklistGroup[] => {
    if (items.length === 0) return []
    if (field === 'Off') return [{ key: 'All tasks', items }]
    const values =
        field === 'status'
            ? [...statuses, ...items.map((item) => item.status).filter((status) => !statuses.includes(status))]
            : field === 'priority'
              ? ['Low', 'Medium', 'High']
              : [...new Set(items.map((item) => item[field]))].sort((left, right) => left.localeCompare(right))
    return values.map((value) => ({ key: value, items: items.filter((item) => item[field] === value) })).filter((group) => group.items.length > 0)
}
