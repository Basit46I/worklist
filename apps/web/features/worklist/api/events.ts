import { z } from 'zod'
import { apiBaseUrl } from './client'

export const subscribeWorkItemEvents = (
    onRefresh: () => void,
    onCommentRefresh: (itemId: string | null) => void,
    onActivityRefresh: (itemId: string | null) => void = onCommentRefresh
): (() => void) => {
    const source = new EventSource(`${apiBaseUrl}/work-items/events`, { withCredentials: true })
    let hasConnected = false
    let refreshTimer: number | undefined
    const scheduleRefresh = (): void => {
        if (refreshTimer !== undefined) window.clearTimeout(refreshTimer)
        refreshTimer = window.setTimeout(() => {
            refreshTimer = undefined
            onRefresh()
        }, 100)
    }
    const onVisibilityChange = (): void => {
        if (document.visibilityState === 'visible') scheduleRefresh()
    }
    const onOnline = (): void => scheduleRefresh()
    source.addEventListener('items-refresh', scheduleRefresh)
    source.onopen = () => {
        if (hasConnected) scheduleRefresh()
        hasConnected = true
        onCommentRefresh(null)
    }
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisibilityChange)
    source.addEventListener('comments-refresh', (event) => {
        const message = event as MessageEvent<string>
        try {
            const parsed = z.object({ itemId: z.string().optional() }).safeParse(JSON.parse(message.data) as unknown)
            if (parsed.success) onCommentRefresh(parsed.data.itemId ?? null)
        } catch {
            // Ignore malformed server-sent event data; the comments API remains authoritative.
        }
    })
    source.addEventListener('activity-refresh', (event) => {
        const message = event as MessageEvent<string>
        try {
            const parsed = z.object({ itemId: z.string().optional() }).safeParse(JSON.parse(message.data) as unknown)
            if (parsed.success) onActivityRefresh(parsed.data.itemId ?? null)
        } catch {
            // Ignore malformed activity refresh data; the activity API remains authoritative.
        }
    })
    return () => {
        source.close()
        window.removeEventListener('online', onOnline)
        document.removeEventListener('visibilitychange', onVisibilityChange)
        if (refreshTimer !== undefined) window.clearTimeout(refreshTimer)
    }
}
