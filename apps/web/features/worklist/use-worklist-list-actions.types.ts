import type { Dispatch, SetStateAction } from 'react'
import type { WorklistList, WorklistSpace, WorklistUser } from './api'
import type { WorkItemColumn, WorkItemColumnWidths, WorkItemFilter, WorkItemSortField, WorkItemStatus } from './model'

type ListSettingsState = Readonly<{
    setSortField: Dispatch<SetStateAction<WorkItemSortField>>
    setSortDirection: Dispatch<SetStateAction<'asc' | 'desc'>>
    setGroupBy: Dispatch<SetStateAction<WorkItemColumn | 'Off'>>
    setVisibleColumns: Dispatch<SetStateAction<readonly WorkItemColumn[]>>
    setColumnWidths: Dispatch<SetStateAction<WorkItemColumnWidths>>
    setSearch: Dispatch<SetStateAction<string>>
    setDebouncedSearch: Dispatch<SetStateAction<string>>
    setStatusFilter: Dispatch<SetStateAction<WorkItemStatus | 'All'>>
    setFilters: Dispatch<SetStateAction<readonly WorkItemFilter[]>>
    setFilterLogic: Dispatch<SetStateAction<'AND' | 'OR'>>
    setActiveSavedViewId: Dispatch<SetStateAction<string>>
    statusFilter: WorkItemStatus | 'All'
}>

export type UseWorklistListActionsOptions = ListSettingsState &
    Readonly<{
        lists: readonly WorklistList[]
        setLists: Dispatch<SetStateAction<readonly WorklistList[]>>
        setSpaces: Dispatch<SetStateAction<readonly WorklistSpace[]>>
        activeListId: string
        setActiveListId: Dispatch<SetStateAction<string>>
        user: WorklistUser | null
        setPageError: (message: string) => void
        setPageNotice: (message: string) => void
        listNameDraft: string
        setListNameDraft: Dispatch<SetStateAction<string>>
        newListDescription: string
        setNewListDescription: Dispatch<SetStateAction<string>>
        newListSpace: string
        setNewListSpace: Dispatch<SetStateAction<string>>
        newListFolder: string
        setNewListFolder: Dispatch<SetStateAction<string>>
        setShowListForm: Dispatch<SetStateAction<boolean>>
        statusDraft: string
        setStatusDraft: Dispatch<SetStateAction<string>>
        setShowStatusForm: Dispatch<SetStateAction<boolean>>
        setDescriptionDraft: Dispatch<SetStateAction<string>>
        setShowDescriptionForm: Dispatch<SetStateAction<boolean>>
        descriptionDraft: string
        setShowNewItem: Dispatch<SetStateAction<boolean>>
    }>
