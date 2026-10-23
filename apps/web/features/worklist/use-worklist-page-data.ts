import { useMemo } from 'react'
import { filterWorkItems, groupWorkItems, sortWorkItems, workItemStatuses } from './model'
import type { WorkItemListQuery } from './api'
import type { useWorklistPageState } from './use-worklist-page-state'
import { useWorklistPageEffects, type WorklistPageRouter } from './use-worklist-page-effects'
import type { WorklistGroup } from '@workspace/worklist-ui'

type PageState = ReturnType<typeof useWorklistPageState>
type Route = 'protected' | 'sign-in' | 'sign-up'
const noSelectedItems: ReadonlySet<string> = new Set()

export const useWorklistPageData = (route: Route, router: WorklistPageRouter, state: PageState) => {
    const {
        items,
        includeArchivedItems,
        setItems,
        lists,
        setLists,
        activeListId,
        setActiveListId,
        user,
        loadedListKey,
        loadingMoreListKey,
        listRequestId,
        selectedIds,
        selectionListKey,
        search,
        setDebouncedSearch,
        debouncedSearch,
        filters,
        filterLogic,
        statusFilter,
        sortField,
        setSortField,
        sortDirection,
        setSortDirection,
        groupBy,
        setGroupBy,
        visibleColumns,
        setVisibleColumns,
        columnWidths,
        setColumnWidths,
        setUser,
        setAuthChecked,
        setStorageUnavailable,
        setStartupError,
        setPageError,
        setSavedViews,
        setTemplates,
        setTemplateId,
        setNextCursor,
        setLoadedListKey,
        setCommentRefresh
    } = state
    const listQuery = useMemo<WorkItemListQuery>(
        () => ({
            listId: activeListId,
            search: debouncedSearch,
            status: statusFilter,
            sortField,
            sortDirection,
            filterLogic,
            filters,
            includeArchived: includeArchivedItems
        }),
        [activeListId, debouncedSearch, statusFilter, sortField, sortDirection, filterLogic, filters, includeArchivedItems]
    )
    const currentListKey = useMemo(() => JSON.stringify([user?.id, listQuery]), [user?.id, listQuery])
    const isListLoaded = loadedListKey === currentListKey
    const visibleItems = useMemo(() => (isListLoaded ? items : []), [isListLoaded, items])
    const visibleSelectedIds = selectionListKey === currentListKey ? selectedIds : noSelectedItems
    const itemsLoading = Boolean(user) && !isListLoaded
    const loadingMoreItems = loadingMoreListKey === currentListKey

    useWorklistPageEffects({
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
        listRequestIdRef: listRequestId,
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
    })

    const filteredItems = useMemo(
        () => sortWorkItems(filterWorkItems(visibleItems, debouncedSearch, statusFilter, filters, filterLogic), sortField, sortDirection),
        [visibleItems, debouncedSearch, statusFilter, filters, filterLogic, sortField, sortDirection]
    )
    const activeList = lists.find((list) => list.id === activeListId)
    const activeStatuses = activeList?.settings.statuses ?? workItemStatuses
    const groups = useMemo<readonly WorklistGroup[]>(
        () => groupWorkItems(filteredItems, groupBy, activeStatuses),
        [filteredItems, groupBy, activeStatuses]
    )
    const defaultListId = lists.find((list) => list.isDefault)?.id
    const listSavedViews = useMemo(
        () => state.savedViews.filter((view) => view.state.listId === activeListId || (!view.state.listId && defaultListId === activeListId)),
        [state.savedViews, activeListId, defaultListId]
    )

    return {
        listQuery,
        currentListKey,
        isListLoaded,
        visibleItems,
        visibleSelectedIds,
        itemsLoading,
        loadingMoreItems,
        filteredItems,
        activeList,
        activeStatuses,
        groups,
        listSavedViews
    } as const
}
