import { request } from './client'
import type { WorkItemActivityRecord, WorkItemComment } from './types'

export const fetchWorkItemComments = async (itemId: string): Promise<readonly WorkItemComment[]> =>
    (await request<{ comments: readonly WorkItemComment[] }>(`/work-items/${encodeURIComponent(itemId)}/comments`)).comments
export const createWorkItemComment = async (itemId: string, body: string): Promise<WorkItemComment> =>
    (
        await request<{ comment: WorkItemComment }>(`/work-items/${encodeURIComponent(itemId)}/comments`, {
            method: 'POST',
            body: JSON.stringify({ body })
        })
    ).comment
export const fetchWorkItemActivity = async (itemId: string): Promise<readonly WorkItemActivityRecord[]> =>
    (await request<{ activities: readonly WorkItemActivityRecord[] }>(`/work-items/${encodeURIComponent(itemId)}/activity`)).activities
