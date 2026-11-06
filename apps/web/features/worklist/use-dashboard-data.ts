import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { logoutUser, updateWorkItem, type WorklistList, type WorklistUser } from './api'
import type { WorkItem } from './model'
import { summarizeDashboardItems, summarizeDashboardSignals } from './dashboard-model'
import { connectDashboardWorkspace } from './dashboard-workspace'

const dateToIso = (date: Date): string =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export const useDashboardData = () => {
    const router = useRouter()
    const [user, setUser] = useState<WorklistUser | null>(null)
    const [lists, setLists] = useState<readonly WorklistList[]>([])
    const [items, setItems] = useState<readonly WorkItem[]>([])
    const [scope, setScope] = useState('all')
    const [myTasksOnly, setMyTasksOnly] = useState(false)
    const [loading, setLoading] = useState(true)
    const [signOutBusy, setSignOutBusy] = useState(false)
    const [error, setError] = useState('')
    const requestRevision = useRef(0)
    const itemUpdateRevisions = useRef(new Map<string, number>())
    const pendingItemUpdates = useRef(new Set<string>())
    const today = dateToIso(new Date())

    const updateItem = (itemId: string, changes: Partial<WorkItem>): void => {
        const previous = items.find((item) => item.id === itemId)
        if (!previous) return
        const revision = (itemUpdateRevisions.current.get(itemId) ?? 0) + 1
        itemUpdateRevisions.current.set(itemId, revision)
        pendingItemUpdates.current.add(itemId)
        setItems((current) => current.map((item) => item.id === itemId ? { ...item, ...changes } : item))
        setError('')
        void updateWorkItem(itemId, changes, previous.updatedAt)
            .then((updated) => {
                if (itemUpdateRevisions.current.get(itemId) !== revision) return
                pendingItemUpdates.current.delete(itemId)
                setItems((current) => current.map((item) => item.id === itemId ? updated : item))
            })
            .catch((cause: unknown) => {
                if (itemUpdateRevisions.current.get(itemId) !== revision) return
                pendingItemUpdates.current.delete(itemId)
                setItems((current) => current.map((item) => item.id === itemId ? previous : item))
                setError(cause instanceof Error ? `Could not save the task change. ${cause.message}` : 'Could not save the task change.')
            })
    }

    useEffect(() => {
        return connectDashboardWorkspace({ router, requestRevision, pendingItemUpdates, setUser, setLists, setItems, setLoading, setError })
    }, [router])

    const scopeItems = useMemo(() => (scope === 'all' ? items : items.filter((item) => item.listId === scope)), [items, scope])
    const scopedItems = useMemo(
        () => (myTasksOnly && user ? scopeItems.filter((item) => item.assignee.trim().toLocaleLowerCase() === user.name.trim().toLocaleLowerCase()) : scopeItems),
        [myTasksOnly, scopeItems, user]
    )
    const scopedLists = useMemo(() => lists.filter((list) => !list.archivedAt && (scope === 'all' || list.id === scope)), [lists, scope])
    const metrics = useMemo(() => summarizeDashboardItems(scopedItems, today), [scopedItems, today])
    const signals = useMemo(() => summarizeDashboardSignals(scopeItems, scopedLists), [scopeItems, scopedLists])
    const maxOpen = Math.max(1, ...metrics.priorities.map(({ count }) => count), ...metrics.assignees.map(({ count }) => count))
    const dueSoon = useMemo(
        () =>
            scopedItems
                .filter((item) => item.status !== 'Done')
                .sort((left, right) => left.dueDate.localeCompare(right.dueDate) || left.id.localeCompare(right.id))
                .slice(0, 6),
        [scopedItems]
    )
    const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'

    const logout = (): void => {
        setSignOutBusy(true)
        void logoutUser()
            .then(() => router.replace('/sign-in'))
            .catch((cause: unknown) =>
                setError(cause instanceof Error ? `Could not sign out: ${cause.message}` : 'Could not sign out. Please try again.')
            )
            .finally(() => setSignOutBusy(false))
    }

    return {
        user,
        lists,
        items,
        scopedItems,
        scope,
        setScope,
        myTasksOnly,
        setMyTasksOnly,
        updateItem,
        scopeItems,
        scopedLists,
        loading,
        signOutBusy,
        error,
        setError,
        today,
        metrics,
        signals,
        maxOpen,
        dueSoon,
        greeting,
        logout
    } as const
}
