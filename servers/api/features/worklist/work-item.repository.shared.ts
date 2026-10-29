import type { Types } from '../../integrations/index.js'

export type BulkDeleteOutcome = Readonly<{ itemId: string; outcome: 'deleted' | 'not_found' | 'failed' }>
export type BulkUpdateOutcome = Readonly<{ itemId: string; outcome: 'applied' | 'not_found' | 'failed' }>

export const mapWithConcurrency = async <T, R>(items: readonly T[], concurrency: number, work: (item: T) => Promise<R>): Promise<readonly R[]> => {
    const results = new Map<number, R>()
    let nextIndex = 0
    const worker = async (): Promise<void> => {
        while (nextIndex < items.length) {
            const index = nextIndex
            nextIndex += 1
            const item = items[index]
            if (item !== undefined) results.set(index, await work(item))
        }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
    return items.map((_item, index) => {
        const result = results.get(index)
        if (result === undefined) throw new Error('Bulk operation result is missing.')
        return result
    })
}

export const serialize = (item: {
    _id: unknown
    updatedAt?: Date
    listId?: Types.ObjectId | null
    parentId?: Types.ObjectId | null
    title: string
    description?: string
    status: string
    priority: string
    assignee: string
    startDate?: Date
    dueDate: Date
    checklist?: readonly Readonly<{ id: string; text: string; completed: boolean }>[]
    dependsOn?: readonly Types.ObjectId[]
    recurrence?: Readonly<{ frequency: 'daily' | 'weekly' | 'monthly'; interval: number }> | null
    tags?: readonly string[]
    archivedAt?: Date | null
    clientRequest?: Readonly<{ contactName: string; contactEmail: string; request: string }> | null
    approvalStatus?: 'not_requested' | 'pending' | 'approved' | 'changes_requested'
    approvalFeedback?: string
    timeSpentMinutes?: number
}) => ({
    id: String(item._id),
    ...(item.updatedAt ? { updatedAt: item.updatedAt.toISOString() } : {}),
    listId: item.listId ? String(item.listId) : '',
    parentId: item.parentId?.toHexString() ?? null,
    title: item.title,
    description: item.description ?? '',
    status: item.status,
    priority: item.priority,
    assignee: item.assignee,
    startDate: (item.startDate ?? item.dueDate).toISOString().slice(0, 10),
    dueDate: item.dueDate.toISOString().slice(0, 10),
    checklist: item.checklist ?? [],
    dependsOn: (item.dependsOn ?? []).map((id) => id.toHexString()),
    recurrence: item.recurrence ?? null,
    tags: item.tags ?? [],
    archivedAt: item.archivedAt?.toISOString() ?? null,
    clientRequest: item.clientRequest ?? null,
    approvalStatus: item.approvalStatus ?? 'not_requested',
    approvalFeedback: item.approvalFeedback ?? '',
    timeSpentMinutes: item.timeSpentMinutes ?? 0
})
export const nextUtcDay = (value: string): Date => {
    const next = new Date(`${value}T00:00:00.000Z`)
    next.setUTCDate(next.getUTCDate() + 1)
    return next
}


export const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
