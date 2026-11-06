import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import {
    fetchWorkItemPage,
    fetchWorklistLists,
    getCurrentUser,
    getWorklistReadiness,
    subscribeWorkItemEvents,
    type WorklistList,
    type WorklistUser
} from './api'
import type { WorkItem } from './model'

const loadListItems = async (listId: string): Promise<readonly WorkItem[]> => {
    const items: WorkItem[] = []
    let cursor: string | undefined

    do {
        const page = await fetchWorkItemPage(
            { listId, search: '', status: 'All', sortField: 'dueDate', sortDirection: 'asc', filterLogic: 'AND', filters: [] },
            cursor
        )
        items.push(...page.items)
        cursor = page.nextCursor ?? undefined
    } while (cursor)

    return items
}

export const connectDashboardWorkspace = ({
    router,
    requestRevision,
    pendingItemUpdates,
    setUser,
    setLists,
    setItems,
    setLoading,
    setError
}: Readonly<{
    router: Readonly<{ replace: (path: '/sign-in') => void }>
    requestRevision: MutableRefObject<number>
    pendingItemUpdates: MutableRefObject<Set<string>>
    setUser: Dispatch<SetStateAction<WorklistUser | null>>
    setLists: Dispatch<SetStateAction<readonly WorklistList[]>>
    setItems: Dispatch<SetStateAction<readonly WorkItem[]>>
    setLoading: Dispatch<SetStateAction<boolean>>
    setError: Dispatch<SetStateAction<string>>
}>): (() => void) => {
    let active = true
    let unsubscribe = (): void => {}

    const loadWorkspaceData = async (initial = false): Promise<void> => {
        const revision = ++requestRevision.current
        if (initial) setLoading(true)

        try {
            const loadedLists = await fetchWorklistLists()
            const loadedItems = await Promise.all(loadedLists.map((list) => loadListItems(list.id)))
            if (!active || revision !== requestRevision.current) return
            setLists(loadedLists)
            const freshItems = loadedItems.flat()
            setItems((current) => {
                const currentById = new Map(current.map((item) => [item.id, item]))
                const refreshed = freshItems.map((item) => {
                    const existing = currentById.get(item.id)
                    if (!existing) return item
                    const existingTimestamp = existing.updatedAt ? Date.parse(existing.updatedAt) : Number.NaN
                    const incomingTimestamp = item.updatedAt ? Date.parse(item.updatedAt) : Number.NaN
                    return pendingItemUpdates.current.has(item.id) || existingTimestamp > incomingTimestamp ? existing : item
                })
                const refreshedIds = new Set(refreshed.map((item) => item.id))
                const localChanges = current.filter((item) => !refreshedIds.has(item.id) && pendingItemUpdates.current.has(item.id))
                return [...refreshed, ...localChanges]
            })
            setError('')
        } catch (cause) {
            if (active && revision === requestRevision.current) setError(cause instanceof Error ? cause.message : 'Could not load your dashboard.')
        } finally {
            if (active && revision === requestRevision.current && initial) setLoading(false)
        }
    }

    void (async () => {
        try {
            const readiness = await getWorklistReadiness()
            if (!active) return
            if (readiness.status === 'not_ready') {
                setError('Worklist needs its database connection before the dashboard can load.')
                setLoading(false)
                return
            }

            const currentUser = await getCurrentUser()
            if (!active) return
            if (!currentUser) {
                router.replace('/sign-in')
                return
            }

            setUser(currentUser)
            await loadWorkspaceData(true)
            if (active) unsubscribe = subscribeWorkItemEvents(() => { void loadWorkspaceData() }, () => {})
        } catch (cause) {
            if (active) {
                setError(cause instanceof Error ? cause.message : 'Could not connect to Worklist.')
                setLoading(false)
            }
        }
    })()

    return () => {
        active = false
        requestRevision.current += 1
        unsubscribe()
    }
}
