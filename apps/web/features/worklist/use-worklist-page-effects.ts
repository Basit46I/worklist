import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import {
    fetchSavedViews,
    fetchWorkItemPage,
    fetchWorklistLists,
    fetchWorklistTemplates,
    getCurrentUser,
    getWorklistReadiness,
    subscribeWorkItemEvents,
    updateWorklistList
} from './api'
import type { WorkItemListQuery, WorklistList, WorklistUser } from './api'
import type { WorkItem, WorkItemColumn, WorkItemColumnWidths, WorkItemSortField } from './model'
import type { SavedView, WorklistTemplate } from './api'

type Setter<T> = Dispatch<SetStateAction<T>>
export type WorklistPageRouter = Readonly<{ replace: (path: '/sign-in' | '/dashboard') => void }>

type WorklistPageEffectsOptions = Readonly<{
    route: 'protected' | 'sign-in' | 'sign-up'
    router: WorklistPageRouter
    search: string
    setDebouncedSearch: Setter<string>
    user: WorklistUser | null
    setUser: Setter<WorklistUser | null>
    setAuthChecked: Setter<boolean>
    setStorageUnavailable: Setter<boolean>
    setStartupError: Setter<string>
    setPageError: Setter<string>
    setSavedViews: Setter<readonly SavedView[]>
    setTemplates: Setter<readonly WorklistTemplate[]>
    setTemplateId: Setter<string>
    lists: readonly WorklistList[]
    setLists: Setter<readonly WorklistList[]>
    activeListId: string
    setActiveListId: Setter<string>
    listQuery: WorkItemListQuery
    currentListKey: string
    listRequestIdRef: MutableRefObject<number>
    setItems: Setter<readonly WorkItem[]>
    setNextCursor: Setter<string | null>
    setLoadedListKey: Setter<string>
    setCommentRefresh: Setter<Readonly<{ itemId: string | null; sequence: number }>>
    sortField: WorkItemSortField
    setSortField: Setter<WorkItemSortField>
    sortDirection: 'asc' | 'desc'
    setSortDirection: Setter<'asc' | 'desc'>
    groupBy: WorklistList['settings']['groupBy']
    setGroupBy: Setter<WorklistList['settings']['groupBy']>
    visibleColumns: readonly WorkItemColumn[]
    setVisibleColumns: Setter<readonly WorkItemColumn[]>
    columnWidths: WorkItemColumnWidths
    setColumnWidths: Setter<WorkItemColumnWidths>
}>

export const useWorklistPageEffects = ({
    route,
    router,
    search,
    setDebouncedSearch,
    user,
    setUser,
    setAuthChecked,
    setStorageUnavailable,
    setStartupError,
    setPageError,
    setSavedViews,
    setTemplates,
    setTemplateId,
    lists,
    setLists,
    activeListId,
    setActiveListId,
    listQuery,
    currentListKey,
    listRequestIdRef,
    setItems,
    setNextCursor,
    setLoadedListKey,
    setCommentRefresh,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    groupBy,
    setGroupBy,
    visibleColumns,
    setVisibleColumns,
    columnWidths,
    setColumnWidths
}: WorklistPageEffectsOptions): void => {
    useEffect(() => {
        const timeout = window.setTimeout(() => setDebouncedSearch(search), 300)
        return () => window.clearTimeout(timeout)
    }, [search, setDebouncedSearch])

    useEffect(() => {
        let active = true
        void getWorklistReadiness()
            .then((readiness) => {
                if (!active) return
                if (readiness.status === 'not_ready') {
                    setStorageUnavailable(true)
                    setAuthChecked(true)
                    return null
                }
                return getCurrentUser()
            })
            .then((currentUser) => {
                if (!active) return
                if (!currentUser) {
                    setAuthChecked(true)
                    if (route === 'protected') router.replace('/sign-in')
                    return
                }
                setUser(currentUser)
                setAuthChecked(true)
                if (route !== 'protected') router.replace('/dashboard')
                return fetchSavedViews()
                    .then((views) => {
                        if (active) setSavedViews(views)
                    })
                    .then(() => fetchWorklistTemplates())
                    .then((loadedTemplates) => {
                        if (active) {
                            setTemplates(loadedTemplates)
                            setTemplateId(loadedTemplates[0]?.id ?? '')
                        }
                    })
                    .catch((error: unknown) => {
                        if (active) setPageError(error instanceof Error ? error.message : 'Could not load your workspace.')
                    })
            })
            .catch((error: unknown) => {
                if (!active) return
                setUser(null)
                setStartupError(error instanceof Error ? error.message : 'Could not connect to Worklist.')
                setAuthChecked(true)
            })
        return () => {
            active = false
        }
    }, [route, router, setStorageUnavailable, setAuthChecked, setUser, setSavedViews, setTemplates, setTemplateId, setPageError, setStartupError])

    useEffect(() => {
        if (!user) return
        let active = true
        void fetchWorklistLists()
            .then((loaded) => {
                if (!active) return
                setLists(loaded)
                const preferred = loaded.find((list) => list.isDefault) ?? loaded[0]
                if (!preferred) return
                setActiveListId(preferred.id)
                setSortField(preferred.settings.sortField)
                setSortDirection(preferred.settings.sortDirection)
                setGroupBy(preferred.settings.groupBy)
                setVisibleColumns(preferred.settings.visibleColumns)
                setColumnWidths(preferred.settings.columnWidths)
            })
            .catch((error: unknown) => {
                if (active) setPageError(error instanceof Error ? error.message : 'Could not load lists.')
            })
        return () => {
            active = false
        }
    }, [user, setLists, setActiveListId, setSortField, setSortDirection, setGroupBy, setVisibleColumns, setColumnWidths, setPageError])

    useEffect(() => {
        if (!user) {
            listRequestIdRef.current += 1
            return
        }
        if (!activeListId) return
        let active = true
        const requestId = ++listRequestIdRef.current
        void fetchWorkItemPage(listQuery)
            .then((page) => {
                if (!active || requestId !== listRequestIdRef.current) return
                setItems(page.items)
                setNextCursor(page.nextCursor)
                setLoadedListKey(currentListKey)
                setPageError('')
            })
            .catch((error: unknown) => {
                if (!active || requestId !== listRequestIdRef.current) return
                setItems([])
                setNextCursor(null)
                setLoadedListKey(currentListKey)
                setPageError(error instanceof Error ? error.message : 'Could not load your tasks.')
            })
        return () => {
            active = false
        }
    }, [user, activeListId, listQuery, currentListKey, listRequestIdRef, setItems, setNextCursor, setLoadedListKey, setPageError])

    useEffect(() => {
        if (!user || !activeListId) return
        let active = true
        const unsubscribe = subscribeWorkItemEvents(
            () => {
                const requestId = ++listRequestIdRef.current
                void fetchWorkItemPage(listQuery)
                    .then((page) => {
                        if (!active || requestId !== listRequestIdRef.current) return
                        setItems(page.items)
                        setNextCursor(page.nextCursor)
                        setLoadedListKey(currentListKey)
                        setPageError('')
                    })
                    .catch((error: unknown) => {
                        if (active && requestId === listRequestIdRef.current)
                            setPageError(error instanceof Error ? error.message : 'Could not refresh your tasks.')
                    })
            },
            (itemId) => setCommentRefresh((current) => ({ itemId, sequence: current.sequence + 1 })),
            (itemId) => setCommentRefresh((current) => ({ itemId, sequence: current.sequence + 1 }))
        )
        return () => {
            active = false
            unsubscribe()
        }
    }, [user, activeListId, listQuery, currentListKey, listRequestIdRef, setItems, setNextCursor, setLoadedListKey, setPageError, setCommentRefresh])

    useEffect(() => {
        const list = lists.find((candidate) => candidate.id === activeListId)
        if (!list) return
        const settings = { sortField, sortDirection, groupBy, visibleColumns, columnWidths, statuses: list.settings.statuses, budgetMinutes: list.settings.budgetMinutes }
        if (JSON.stringify(settings) === JSON.stringify(list.settings)) return
        const timeout = window.setTimeout(() => {
            void updateWorklistList(list.id, { settings })
                .then((updated) => {
                    setLists((current) => current.map((candidate) => (candidate.id === updated.id ? updated : candidate)))
                })
                .catch((error: unknown) => {
                    setPageError(error instanceof Error ? error.message : 'Could not save list settings.')
                })
        }, 400)
        return () => window.clearTimeout(timeout)
    }, [lists, activeListId, sortField, sortDirection, groupBy, visibleColumns, columnWidths, setLists, setPageError])
}
