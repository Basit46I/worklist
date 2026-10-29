import type { useWorklistPageState } from './use-worklist-page-state'
import type { useWorklistPageData } from './use-worklist-page-data'
import type { WorklistPageRouter } from './use-worklist-page-effects'
import { useWorklistAuth } from './use-worklist-auth'
import { useWorklistSavedViews } from './use-worklist-saved-views'
import { useWorklistListActions } from './use-worklist-list-actions'
import { useWorklistTemplateActions } from './use-worklist-template-actions'
import { useWorklistItemActions } from './use-worklist-item-actions'
import { useWorklistBulkActions } from './use-worklist-bulk-actions'
import { useWorklistTeamActions } from './use-worklist-team-actions'
import { useWorklistViewActions } from './use-worklist-view-actions'

type PageData = ReturnType<typeof useWorklistPageData>
type PageState = ReturnType<typeof useWorklistPageState>
type Route = 'protected' | 'sign-in' | 'sign-up'

export const useWorklistPageActions = (route: Route, router: WorklistPageRouter, state: PageState, data: PageData) => {
    const auth = useWorklistAuth({
        mode: route === 'sign-up' ? 'register' : 'login',
        router,
        setUser: state.setUser,
        setAuthChecked: state.setAuthChecked,
        setSavedViews: state.setSavedViews,
        setPageError: state.setPageError
    })
    const savedViews = useWorklistSavedViews({
        activeListId: state.activeListId,
        search: state.search,
        statusFilter: state.statusFilter,
        sortField: state.sortField,
        sortDirection: state.sortDirection,
        groupBy: state.groupBy,
        visibleColumns: state.visibleColumns,
        filters: state.filters,
        filterLogic: state.filterLogic,
        columnWidths: state.columnWidths,
        savedViewNameDraft: state.savedViewNameDraft,
        setSavedViewNameDraft: state.setSavedViewNameDraft,
        setShowSaveViewForm: state.setShowSaveViewForm,
        setSearch: state.setSearch,
        setStatusFilter: state.setStatusFilter,
        setSortField: state.setSortField,
        setSortDirection: state.setSortDirection,
        setGroupBy: state.setGroupBy,
        setVisibleColumns: state.setVisibleColumns,
        setFilters: state.setFilters,
        setFilterLogic: state.setFilterLogic,
        setColumnWidths: state.setColumnWidths,
        savedViews: state.savedViews,
        setSavedViews: state.setSavedViews,
        activeSavedViewId: state.activeSavedViewId,
        setActiveSavedViewId: state.setActiveSavedViewId,
        setPageError: state.setPageError,
        setPageNotice: state.setPageNotice
    })
    const lists = useWorklistListActions({
        lists: state.lists,
        setLists: state.setLists,
        setSpaces: state.setSpaces,
        activeListId: state.activeListId,
        setActiveListId: state.setActiveListId,
        user: state.user,
        setPageError: state.setPageError,
        setPageNotice: state.setPageNotice,
        listNameDraft: state.listNameDraft,
        setListNameDraft: state.setListNameDraft,
        newListDescription: state.newListDescription,
        setNewListDescription: state.setNewListDescription,
        newListSpace: state.newListSpace,
        setNewListSpace: state.setNewListSpace,
        newListFolder: state.newListFolder,
        setNewListFolder: state.setNewListFolder,
        setShowListForm: state.setShowListForm,
        statusDraft: state.statusDraft,
        setStatusDraft: state.setStatusDraft,
        setShowStatusForm: state.setShowStatusForm,
        setDescriptionDraft: state.setDescriptionDraft,
        setShowDescriptionForm: state.setShowDescriptionForm,
        descriptionDraft: state.descriptionDraft,
        setShowNewItem: state.setShowNewItem,
        setSortField: state.setSortField,
        setSortDirection: state.setSortDirection,
        setGroupBy: state.setGroupBy,
        setVisibleColumns: state.setVisibleColumns,
        setColumnWidths: state.setColumnWidths,
        setSearch: state.setSearch,
        setDebouncedSearch: state.setDebouncedSearch,
        setStatusFilter: state.setStatusFilter,
        setFilters: state.setFilters,
        setFilterLogic: state.setFilterLogic,
        setActiveSavedViewId: state.setActiveSavedViewId,
        statusFilter: state.statusFilter
    })
    const templates = useWorklistTemplateActions({
        templates: state.templates,
        setTemplates: state.setTemplates,
        templateId: state.templateId,
        setTemplateId: state.setTemplateId,
        templateListName: state.templateListName,
        setTemplateListName: state.setTemplateListName,
        creatingTemplate: state.creatingTemplate,
        setCreatingTemplate: state.setCreatingTemplate,
        templateEditingId: state.templateEditingId,
        setTemplateEditingId: state.setTemplateEditingId,
        templateNameDraft: state.templateNameDraft,
        setTemplateNameDraft: state.setTemplateNameDraft,
        templateDescriptionDraft: state.templateDescriptionDraft,
        setTemplateDescriptionDraft: state.setTemplateDescriptionDraft,
        templateStatusesDraft: state.templateStatusesDraft,
        setTemplateStatusesDraft: state.setTemplateStatusesDraft,
        templateTasksDraft: state.templateTasksDraft,
        setTemplateTasksDraft: state.setTemplateTasksDraft,
        newListSpace: state.newListSpace,
        setNewListSpace: state.setNewListSpace,
        newListFolder: state.newListFolder,
        setNewListFolder: state.setNewListFolder,
        setLists: state.setLists,
        setSpaces: state.setSpaces,
        setItems: state.setItems,
        setShowTemplatePicker: state.setShowTemplatePicker,
        setShowTemplateBuilder: state.setShowTemplateBuilder,
        selectList: lists.selectList,
        setPageError: state.setPageError,
        setPageNotice: state.setPageNotice
    })
    const views = useWorklistViewActions({
        sortField: state.sortField,
        setSortField: state.setSortField,
        setSortDirection: state.setSortDirection,
        setVisibleColumns: state.setVisibleColumns,
        setColumnWidths: state.setColumnWidths,
        setFilters: state.setFilters,
        firstStatus: data.activeStatuses[0]
    })
    const items = useWorklistItemActions({
        activeListId: state.activeListId,
        activeStatuses: data.activeStatuses,
        items: state.items,
        setItems: state.setItems,
        newTitle: state.newTitle,
        newDescription: state.newDescription,
        newStatus: state.newStatus,
        newPriority: state.newPriority,
        newAssignee: state.newAssignee,
        newDueDate: state.newDueDate,
        setNewTitle: state.setNewTitle,
        setNewDescription: state.setNewDescription,
        setNewStatus: state.setNewStatus,
        setNewPriority: state.setNewPriority,
        setNewAssignee: state.setNewAssignee,
        setNewDueDate: state.setNewDueDate,
        setShowNewItem: state.setShowNewItem,
        setStatusFilter: state.setStatusFilter,
        setPageError: state.setPageError,
        setPageNotice: state.setPageNotice,
        itemUpdateRevisions: state.itemUpdateRevisions
    })
    const bulk = useWorklistBulkActions({
        items: state.items,
        setItems: state.setItems,
        visibleSelectedIds: data.visibleSelectedIds,
        setSelectedIds: state.setSelectedIds,
        selectionListKey: state.selectionListKey,
        setSelectionListKey: state.setSelectionListKey,
        currentListKey: data.currentListKey,
        activeListId: state.activeListId,
        lists: state.lists,
        bulkStatus: state.bulkStatus,
        bulkPriority: state.bulkPriority,
        bulkAssignee: state.bulkAssignee,
        bulkDueDate: state.bulkDueDate,
        bulkListId: state.bulkListId,
        listQuery: data.listQuery,
        user: state.user,
        nextCursor: state.nextCursor,
        loadingMoreItems: data.loadingMoreItems,
        isListLoaded: data.isListLoaded,
        listRequestId: state.listRequestId,
        setNextCursor: state.setNextCursor,
        setLoadingMoreListKey: state.setLoadingMoreListKey,
        setBulkResults: state.setBulkResults,
        setPageError: state.setPageError,
        setPageNotice: state.setPageNotice
    })
    const team = useWorklistTeamActions({
        user: state.user,
        setTeamMembers: state.setTeamMembers,
        setShowInviteForm: state.setShowInviteForm,
        setShowTeamMembers: state.setShowTeamMembers,
        setPageError: state.setPageError,
        setPageNotice: state.setPageNotice
    })

    return { auth, lists, templates, savedViews, views, items, bulk, team } as const
}
