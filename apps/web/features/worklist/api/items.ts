import type { WorkItem } from '../model'
import { request } from './client'
import type { BulkDeleteResult, BulkUpdateResult, WorkItemListQuery, WorkItemPage } from './types'

export const fetchWorkItemPage = async (query: WorkItemListQuery, cursor?: string): Promise<WorkItemPage> => {
    const params = new URLSearchParams({
        limit: '50',
        listId: query.listId,
        search: query.search,
        status: query.status,
        sortField: query.sortField,
        sortDirection: query.sortDirection,
        filterLogic: query.filterLogic,
        filters: JSON.stringify(query.filters)
    })
    if (query.includeArchived) params.set('includeArchived', 'true')
    if (cursor) params.set('cursor', cursor)
    return request<WorkItemPage>(`/work-items?${params.toString()}`)
}
export const createWorkItem = async (input: Omit<WorkItem, 'id'>): Promise<WorkItem> =>
    (await request<{ item: WorkItem }>('/work-items', { method: 'POST', body: JSON.stringify(input) })).item
export const updateWorkItem = async (id: string, changes: Partial<Omit<WorkItem, 'id'>>, expectedUpdatedAt?: string): Promise<WorkItem> =>
    (await request<{ item: WorkItem }>(`/work-items/${encodeURIComponent(id)}`, { method: 'PATCH', ...(expectedUpdatedAt ? { headers: { 'If-Match': `"${expectedUpdatedAt}"` } } : {}), body: JSON.stringify(changes) })).item
export const requestWorkItemApproval = async (id: string): Promise<void> => {
    await request(`/work-items/${encodeURIComponent(id)}/request-approval`, { method: 'POST' })
}
export const deleteWorkItem = (id: string): Promise<void> => request<void>(`/work-items/${encodeURIComponent(id)}`, { method: 'DELETE' })
export const setWorkItemArchived = async (id: string, archived: boolean): Promise<WorkItem> =>
    (await request<{ item: WorkItem }>(`/work-items/${encodeURIComponent(id)}/${archived ? 'archive' : 'restore'}`, { method: 'POST' })).item
export const duplicateWorkItem = async (id: string): Promise<WorkItem> =>
    (await request<{ item: WorkItem }>(`/work-items/${encodeURIComponent(id)}/duplicate`, { method: 'POST' })).item
export const deleteWorkItems = (ids: readonly string[]): Promise<BulkDeleteResult> =>
    request<BulkDeleteResult>('/work-items', { method: 'DELETE', body: JSON.stringify({ itemIds: ids }) })
export const updateWorkItems = async (
    ids: readonly string[],
    changes: Readonly<{ listId?: string; status?: WorkItem['status']; priority?: WorkItem['priority']; assignee?: string; dueDate?: string }>
): Promise<BulkUpdateResult> => request<BulkUpdateResult>('/work-items/bulk', { method: 'PATCH', body: JSON.stringify({ itemIds: ids, changes }) })
