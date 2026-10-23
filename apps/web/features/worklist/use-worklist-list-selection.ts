'use client'

import { useCallback, useEffect } from 'react'
import type { WorklistList } from './api'
import type { UseWorklistListActionsOptions } from './use-worklist-list-actions.types'

export const useWorklistListSelection = (options: UseWorklistListActionsOptions) => {
    const {
        setActiveListId,
        setSortField,
        setSortDirection,
        setGroupBy,
        setVisibleColumns,
        setColumnWidths,
        setSearch,
        setDebouncedSearch,
        setStatusFilter,
        setFilters,
        setFilterLogic,
        setActiveSavedViewId,
        user,
        lists,
        activeListId,
        setShowNewItem
    } = options
    const selectList = useCallback(
        (list: WorklistList): void => {
            setActiveListId(list.id)
            setSortField(list.settings.sortField)
            setSortDirection(list.settings.sortDirection)
            setGroupBy(list.settings.groupBy)
            setVisibleColumns(list.settings.visibleColumns)
            setColumnWidths(list.settings.columnWidths)
            setSearch('')
            setDebouncedSearch('')
            setStatusFilter('All')
            setFilters([])
            setFilterLogic('AND')
            setActiveSavedViewId('')
        },
        [
            setActiveListId,
            setSortField,
            setSortDirection,
            setGroupBy,
            setVisibleColumns,
            setColumnWidths,
            setSearch,
            setDebouncedSearch,
            setStatusFilter,
            setFilters,
            setFilterLogic,
            setActiveSavedViewId
        ]
    )

    useEffect(() => {
        if (!user || !lists.length) return
        const params = new URLSearchParams(window.location.search)
        const requestedListId = params.get('listId')
        const requestedList = requestedListId ? lists.find((list) => list.id === requestedListId) : undefined
        const openNewTask = params.get('newTask') === '1'
        if (!requestedList && !openNewTask) return
        const timeout = window.setTimeout(() => {
            if (requestedList && requestedList.id !== activeListId) selectList(requestedList)
            if (openNewTask) setShowNewItem(true)
            window.history.replaceState(null, '', '/worklist')
        }, 0)
        return () => window.clearTimeout(timeout)
    }, [user, lists, activeListId, setShowNewItem, selectList])

    return { selectList } as const
}
