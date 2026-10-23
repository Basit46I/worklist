'use client'

import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { createSavedView, deleteSavedView, updateSavedView, type SavedView, type SavedViewState } from './api'
import type { WorkItemColumn, WorkItemColumnWidths, WorkItemFilter, WorkItemSortField, WorkItemStatus } from './model'

type SavedViewStateSetters = Readonly<{
    setSearch: Dispatch<SetStateAction<string>>
    setStatusFilter: Dispatch<SetStateAction<WorkItemStatus | 'All'>>
    setSortField: Dispatch<SetStateAction<WorkItemSortField>>
    setSortDirection: Dispatch<SetStateAction<'asc' | 'desc'>>
    setGroupBy: Dispatch<SetStateAction<WorkItemColumn | 'Off'>>
    setVisibleColumns: Dispatch<SetStateAction<readonly WorkItemColumn[]>>
    setFilters: Dispatch<SetStateAction<readonly WorkItemFilter[]>>
    setFilterLogic: Dispatch<SetStateAction<'AND' | 'OR'>>
    setColumnWidths: Dispatch<SetStateAction<WorkItemColumnWidths>>
}>

type UseWorklistSavedViewsOptions = SavedViewStateSetters &
    Readonly<{
        activeListId: string
        search: string
        statusFilter: WorkItemStatus | 'All'
        sortField: WorkItemSortField
        sortDirection: 'asc' | 'desc'
        groupBy: WorkItemColumn | 'Off'
        visibleColumns: readonly WorkItemColumn[]
        filters: readonly WorkItemFilter[]
        filterLogic: 'AND' | 'OR'
        columnWidths: WorkItemColumnWidths
        savedViewNameDraft: string
        setSavedViewNameDraft: Dispatch<SetStateAction<string>>
        setShowSaveViewForm: Dispatch<SetStateAction<boolean>>
        savedViews: readonly SavedView[]
        setSavedViews: Dispatch<SetStateAction<readonly SavedView[]>>
        activeSavedViewId: string
        setActiveSavedViewId: Dispatch<SetStateAction<string>>
        setPageError: (message: string) => void
        setPageNotice: (message: string) => void
    }>

export const useWorklistSavedViews = (options: UseWorklistSavedViewsOptions) => {
    const currentViewState = (): SavedViewState => ({
        listId: options.activeListId,
        search: options.search,
        statusFilter: options.statusFilter,
        sortField: options.sortField,
        sortDirection: options.sortDirection,
        groupBy: options.groupBy,
        visibleColumns: options.visibleColumns,
        filters: options.filters,
        filterLogic: options.filterLogic,
        columnWidths: options.columnWidths
    })

    const saveCurrentView = (): void => {
        options.setSavedViewNameDraft('')
        options.setShowSaveViewForm(true)
    }
    const submitSavedView = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault()
        const name = options.savedViewNameDraft.trim()
        if (!name) return
        void createSavedView(name, currentViewState(), 'private')
            .then((view) => {
                options.setSavedViews((current) => [...current.filter((saved) => saved.id !== view.id), view])
                options.setActiveSavedViewId(view.id)
                options.setShowSaveViewForm(false)
                options.setPageError('')
                options.setPageNotice('Saved view created.')
            })
            .catch((error: unknown) => options.setPageError(error instanceof Error ? error.message : 'Could not save this view.'))
    }

    const updateActiveSavedView = (): void => {
        const view = options.savedViews.find((candidate) => candidate.id === options.activeSavedViewId)
        if (!view) return
        const name = window.prompt('Update saved view name', view.name)
        if (!name?.trim()) return
        void updateSavedView(view.id, name.trim(), currentViewState(), view.visibility)
            .then((updatedView) => {
                options.setSavedViews((current) => current.map((candidate) => (candidate.id === updatedView.id ? updatedView : candidate)))
                options.setPageError('')
                options.setPageNotice('Saved view updated.')
            })
            .catch((error: unknown) => options.setPageError(error instanceof Error ? error.message : 'Could not update this view.'))
    }

    const toggleSavedViewVisibility = (): void => {
        const view = options.savedViews.find((candidate) => candidate.id === options.activeSavedViewId)
        if (!view || !view.canManage) return
        const visibility = view.visibility === 'team' ? 'private' : 'team'
        void updateSavedView(view.id, view.name, view.state, visibility)
            .then((updatedView) => {
                options.setSavedViews((current) => current.map((candidate) => (candidate.id === updatedView.id ? updatedView : candidate)))
                options.setPageError('')
                options.setPageNotice(visibility === 'team' ? 'Saved view shared with your team.' : 'Saved view made private.')
            })
            .catch((error: unknown) => options.setPageError(error instanceof Error ? error.message : 'Could not change view sharing.'))
    }

    const selectSavedView = (viewId: string): void => {
        options.setActiveSavedViewId(viewId)
        const view = options.savedViews.find((candidate) => candidate.id === viewId)
        if (!view) return
        options.setSearch(view.state.search)
        options.setStatusFilter(view.state.statusFilter)
        options.setSortField(view.state.sortField)
        options.setSortDirection(view.state.sortDirection)
        options.setGroupBy(view.state.groupBy)
        options.setVisibleColumns(view.state.visibleColumns)
        options.setFilters(view.state.filters)
        options.setFilterLogic(view.state.filterLogic)
        if (view.state.columnWidths) options.setColumnWidths(view.state.columnWidths)
    }

    const deleteActiveSavedView = (): void => {
        const view = options.savedViews.find((candidate) => candidate.id === options.activeSavedViewId)
        if (!view || !window.confirm(`Delete the saved view “${view.name}”? Your tasks will not be deleted.`)) return
        void deleteSavedView(view.id)
            .then(() => {
                options.setSavedViews((current) => current.filter((candidate) => candidate.id !== view.id))
                options.setActiveSavedViewId('')
                options.setPageError('')
                options.setPageNotice('Saved view deleted. Your tasks were not changed.')
            })
            .catch((error: unknown) => options.setPageError(error instanceof Error ? error.message : 'Could not delete this view.'))
    }

    return { saveCurrentView, submitSavedView, updateActiveSavedView, toggleSavedViewVisibility, selectSavedView, deleteActiveSavedView } as const
}
