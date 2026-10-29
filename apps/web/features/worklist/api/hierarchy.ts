import { request } from './client'
import type { WorklistFolder, WorklistSpace } from './types'

export const fetchWorklistSpaces = async (): Promise<readonly WorklistSpace[]> =>
    (await request<{ spaces: readonly WorklistSpace[] }>('/spaces')).spaces

export const createWorklistSpace = async (name: string, description = ''): Promise<WorklistSpace> =>
    (await request<{ space: WorklistSpace }>('/spaces', { method: 'POST', body: JSON.stringify({ name, description }) })).space

export const fetchWorklistFolders = async (spaceId: string): Promise<readonly WorklistFolder[]> =>
    (await request<{ folders: readonly WorklistFolder[] }>(`/spaces/${encodeURIComponent(spaceId)}/folders`)).folders

export const createWorklistFolder = async (spaceId: string, name: string): Promise<WorklistFolder> =>
    (await request<{ folder: WorklistFolder }>(`/spaces/${encodeURIComponent(spaceId)}/folders`, { method: 'POST', body: JSON.stringify({ name }) })).folder
