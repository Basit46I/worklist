import { request } from './client'
import type { SavedView, SavedViewState } from './types'

export const fetchSavedViews = async (): Promise<readonly SavedView[]> => (await request<{ views: readonly SavedView[] }>('/saved-views')).views
export const createSavedView = async (name: string, state: SavedViewState, visibility: SavedView['visibility']): Promise<SavedView> =>
    (await request<{ view: SavedView }>('/saved-views', { method: 'POST', body: JSON.stringify({ name, state, visibility }) })).view
export const updateSavedView = async (id: string, name: string, state: SavedViewState, visibility: SavedView['visibility']): Promise<SavedView> =>
    (
        await request<{ view: SavedView }>(`/saved-views/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            body: JSON.stringify({ name, state, visibility })
        })
    ).view
export const deleteSavedView = (id: string): Promise<void> => request<void>(`/saved-views/${encodeURIComponent(id)}`, { method: 'DELETE' })
