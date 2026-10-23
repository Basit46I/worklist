import { useEffect, useRef, useState } from 'react'
import type { SavedView, WorklistList, WorklistTeamMember, WorklistTemplate, WorklistUser } from './api'
import { defaultWorkItemColumnWidths } from './model'
import type { WorkItem, WorkItemColumn, WorkItemColumnWidths, WorkItemFilter, WorkItemPriority, WorkItemSortField, WorkItemStatus } from './model'
import { dateInOneWeek } from '@workspace/worklist-ui'

export type BulkOperationDetail = Readonly<{ itemId: string; title: string; outcome: string }>

export const useWorklistPageState = () => {
    const [items, setItems] = useState<readonly WorkItem[]>([])
    const [lists, setLists] = useState<readonly WorklistList[]>([])
    const [activeListId, setActiveListId] = useState('')
    const [listNameDraft, setListNameDraft] = useState('')
    const [newListDescription, setNewListDescription] = useState('')
    const [newListSpace, setNewListSpace] = useState('General')
    const [newListFolder, setNewListFolder] = useState('')
    const [showListForm, setShowListForm] = useState(false)
    const [showDescriptionForm, setShowDescriptionForm] = useState(false)
    const [descriptionDraft, setDescriptionDraft] = useState('')
    const [showStatusForm, setShowStatusForm] = useState(false)
    const [statusDraft, setStatusDraft] = useState('')
    const [showSaveViewForm, setShowSaveViewForm] = useState(false)
    const [savedViewNameDraft, setSavedViewNameDraft] = useState('')
    const [includeArchivedLists, setIncludeArchivedLists] = useState(false)
    const [includeArchivedItems, setIncludeArchivedItems] = useState(false)
    const [user, setUser] = useState<WorklistUser | null>(null)
    const [authChecked, setAuthChecked] = useState(false)
    const [storageUnavailable, setStorageUnavailable] = useState(false)
    const [startupError, setStartupError] = useState('')
    const [signOutBusy, setSignOutBusy] = useState(false)
    const [pageError, setPageError] = useState('')
    const [pageNotice, setPageNotice] = useState('')
    const [bulkResults, setBulkResults] = useState<readonly BulkOperationDetail[]>([])
    const [loadedListKey, setLoadedListKey] = useState('')
    const [loadingMoreListKey, setLoadingMoreListKey] = useState('')
    const [nextCursor, setNextCursor] = useState<string | null>(null)
    const listRequestId = useRef(0)
    const itemUpdateRevisions = useRef(new Map<string, number>())
    const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set())
    const [selectionListKey, setSelectionListKey] = useState('')
    const [commentRefresh, setCommentRefresh] = useState<Readonly<{ itemId: string | null; sequence: number }>>({ itemId: null, sequence: 0 })
    const [bulkStatus, setBulkStatus] = useState<WorkItemStatus>('In progress')
    const [bulkPriority, setBulkPriority] = useState<WorkItemPriority>('High')
    const [bulkAssignee, setBulkAssignee] = useState('')
    const [bulkDueDate, setBulkDueDate] = useState(dateInOneWeek)
    const [bulkListId, setBulkListId] = useState('')
    const [savedViews, setSavedViews] = useState<readonly SavedView[]>([])
    const [activeSavedViewId, setActiveSavedViewId] = useState('')
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [filters, setFilters] = useState<readonly WorkItemFilter[]>([])
    const [filterLogic, setFilterLogic] = useState<'AND' | 'OR'>('AND')
    const [showFilterBuilder, setShowFilterBuilder] = useState(false)
    const [statusFilter, setStatusFilter] = useState<WorkItemStatus | 'All'>('All')
    const [viewMode, setViewMode] = useState<'list' | 'board' | 'calendar'>('list')
    useEffect(() => {
        const timer = window.setTimeout(() => {
            const query = new URLSearchParams(window.location.search)
            if (query.get('view') === 'board') setViewMode('board')
            const initialSearch = query.get('search') ?? ''
            setSearch(initialSearch)
            setDebouncedSearch(initialSearch)
        }, 0)
        return () => window.clearTimeout(timer)
    }, [])
    const [sortField, setSortField] = useState<WorkItemSortField>('dueDate')
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
    const [groupBy, setGroupBy] = useState<WorkItemColumn | 'Off'>('status')
    const [visibleColumns, setVisibleColumns] = useState<readonly WorkItemColumn[]>(['status', 'priority', 'assignee', 'dueDate'])
    const [columnWidths, setColumnWidths] = useState<WorkItemColumnWidths>(defaultWorkItemColumnWidths)
    const [showColumnPicker, setShowColumnPicker] = useState(true)
    const [showNewItem, setShowNewItem] = useState(false)
    const [showTemplatePicker, setShowTemplatePicker] = useState(false)
    const [templates, setTemplates] = useState<readonly WorklistTemplate[]>([])
    const [templateId, setTemplateId] = useState('')
    const [templateListName, setTemplateListName] = useState('')
    const [creatingTemplate, setCreatingTemplate] = useState(false)
    const [showTemplateBuilder, setShowTemplateBuilder] = useState(false)
    const [templateEditingId, setTemplateEditingId] = useState('')
    const [templateNameDraft, setTemplateNameDraft] = useState('')
    const [templateDescriptionDraft, setTemplateDescriptionDraft] = useState('')
    const [templateStatusesDraft, setTemplateStatusesDraft] = useState('To do\nIn progress\nDone')
    const [templateTasksDraft, setTemplateTasksDraft] = useState('')
    const [showInviteForm, setShowInviteForm] = useState(false)
    const [showTeamMembers, setShowTeamMembers] = useState(false)
    const [teamMembers, setTeamMembers] = useState<readonly WorklistTeamMember[]>([])
    const [newTitle, setNewTitle] = useState('')
    const [newDescription, setNewDescription] = useState('')
    const [newStatus, setNewStatus] = useState<WorkItemStatus>('To do')
    const [newPriority, setNewPriority] = useState<WorkItemPriority>('Medium')
    const [newAssignee, setNewAssignee] = useState('Unassigned')
    const [newDueDate, setNewDueDate] = useState(dateInOneWeek)

    return {
        items,
        setItems,
        lists,
        setLists,
        activeListId,
        setActiveListId,
        listNameDraft,
        setListNameDraft,
        newListDescription,
        setNewListDescription,
        newListSpace,
        setNewListSpace,
        newListFolder,
        setNewListFolder,
        showListForm,
        setShowListForm,
        showDescriptionForm,
        setShowDescriptionForm,
        descriptionDraft,
        setDescriptionDraft,
        showStatusForm,
        setShowStatusForm,
        statusDraft,
        setStatusDraft,
        showSaveViewForm,
        setShowSaveViewForm,
        savedViewNameDraft,
        setSavedViewNameDraft,
        includeArchivedLists,
        setIncludeArchivedLists,
        includeArchivedItems,
        setIncludeArchivedItems,
        user,
        setUser,
        authChecked,
        setAuthChecked,
        storageUnavailable,
        setStorageUnavailable,
        startupError,
        setStartupError,
        signOutBusy,
        setSignOutBusy,
        pageError,
        setPageError,
        pageNotice,
        setPageNotice,
        bulkResults,
        setBulkResults,
        loadedListKey,
        setLoadedListKey,
        loadingMoreListKey,
        setLoadingMoreListKey,
        nextCursor,
        setNextCursor,
        listRequestId,
        itemUpdateRevisions,
        selectedIds,
        setSelectedIds,
        selectionListKey,
        setSelectionListKey,
        commentRefresh,
        setCommentRefresh,
        bulkStatus,
        setBulkStatus,
        bulkPriority,
        setBulkPriority,
        bulkAssignee,
        setBulkAssignee,
        bulkDueDate,
        setBulkDueDate,
        bulkListId,
        setBulkListId,
        savedViews,
        setSavedViews,
        activeSavedViewId,
        setActiveSavedViewId,
        search,
        setSearch,
        debouncedSearch,
        setDebouncedSearch,
        filters,
        setFilters,
        filterLogic,
        setFilterLogic,
        showFilterBuilder,
        setShowFilterBuilder,
        statusFilter,
        setStatusFilter,
        viewMode,
        setViewMode,
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
        showColumnPicker,
        setShowColumnPicker,
        showNewItem,
        setShowNewItem,
        showTemplatePicker,
        setShowTemplatePicker,
        templates,
        setTemplates,
        templateId,
        setTemplateId,
        templateListName,
        setTemplateListName,
        creatingTemplate,
        setCreatingTemplate,
        showTemplateBuilder,
        setShowTemplateBuilder,
        templateEditingId,
        setTemplateEditingId,
        templateNameDraft,
        setTemplateNameDraft,
        templateDescriptionDraft,
        setTemplateDescriptionDraft,
        templateStatusesDraft,
        setTemplateStatusesDraft,
        templateTasksDraft,
        setTemplateTasksDraft,
        showInviteForm,
        setShowInviteForm,
        showTeamMembers,
        setShowTeamMembers,
        teamMembers,
        setTeamMembers,
        newTitle,
        setNewTitle,
        newDescription,
        setNewDescription,
        newStatus,
        setNewStatus,
        newPriority,
        setNewPriority,
        newAssignee,
        setNewAssignee,
        newDueDate,
        setNewDueDate
    } as const
}
