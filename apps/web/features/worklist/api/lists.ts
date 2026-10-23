import { request } from './client'
import type { WorklistList, WorklistListSettings, WorklistTemplate } from './types'

export const fetchWorklistLists = async (includeArchived = false): Promise<readonly WorklistList[]> =>
    (await request<{ lists: readonly WorklistList[] }>(`/lists?includeArchived=${includeArchived}`)).lists
export const createWorklistList = async (
    name: string,
    description = '',
    spaceName = 'General',
    folderName = '',
    statuses?: readonly string[]
): Promise<WorklistList> =>
    (
        await request<{ list: WorklistList }>('/lists', {
            method: 'POST',
            body: JSON.stringify({ name, description, spaceName, folderName, ...(statuses ? { statuses } : {}) })
        })
    ).list
export const fetchWorklistTemplates = async (): Promise<readonly WorklistTemplate[]> =>
    (await request<{ templates: readonly WorklistTemplate[] }>('/templates')).templates
export const createWorklistTemplate = async (template: Omit<WorklistTemplate, 'id'>): Promise<WorklistTemplate> =>
    (await request<{ template: WorklistTemplate }>('/templates', { method: 'POST', body: JSON.stringify(template) })).template
export const updateWorklistTemplate = async (id: string, template: Omit<WorklistTemplate, 'id'>): Promise<WorklistTemplate> =>
    (await request<{ template: WorklistTemplate }>(`/templates/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(template) }))
        .template
export const deleteWorklistTemplate = (id: string): Promise<void> => request<void>(`/templates/${encodeURIComponent(id)}`, { method: 'DELETE' })
export const updateWorklistList = async (
    listId: string,
    changes: Readonly<{ name?: string; description?: string; spaceName?: string; folderName?: string; settings?: WorklistListSettings }>
): Promise<WorklistList> =>
    (await request<{ list: WorklistList }>(`/lists/${encodeURIComponent(listId)}`, { method: 'PATCH', body: JSON.stringify(changes) })).list
export const duplicateWorklistList = async (listId: string, name: string): Promise<WorklistList> =>
    (await request<{ list: WorklistList }>(`/lists/${encodeURIComponent(listId)}/duplicate`, { method: 'POST', body: JSON.stringify({ name }) })).list
export const archiveWorklistList = async (listId: string): Promise<WorklistList> =>
    (await request<{ list: WorklistList }>(`/lists/${encodeURIComponent(listId)}/archive`, { method: 'POST' })).list
export const restoreWorklistList = async (listId: string): Promise<WorklistList> =>
    (await request<{ list: WorklistList }>(`/lists/${encodeURIComponent(listId)}/restore`, { method: 'POST' })).list
export const deleteWorklistList = (listId: string): Promise<void> => request<void>(`/lists/${encodeURIComponent(listId)}`, { method: 'DELETE' })
