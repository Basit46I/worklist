import type { WorkItem, WorkItemColumnWidths, WorkItemFilter } from '../model'

export type WorklistUser = Readonly<{
    id: string
    name: string
    email: string
    teamId: string
    teamName: string
    role: 'owner' | 'editor' | 'viewer'
}>
export type WorklistTeamMember = Readonly<{ id: string; name: string; email: string; role: WorklistUser['role'] }>
export type WorklistListSettings = Readonly<{
    sortField: 'title' | 'status' | 'priority' | 'assignee' | 'dueDate'
    sortDirection: 'asc' | 'desc'
    groupBy: 'Off' | 'status' | 'priority' | 'assignee' | 'dueDate'
    visibleColumns: readonly ('status' | 'priority' | 'assignee' | 'dueDate')[]
    columnWidths: WorkItemColumnWidths
    statuses: readonly string[]
    budgetMinutes: number
}>
export type WorklistList = Readonly<{
    id: string
    name: string
    description: string
    spaceName: string
    folderName: string
    spaceId?: string | null
    folderId?: string | null
    isDefault: boolean
    archivedAt: string | null
    requestFormEnabled?: boolean
    settings: WorklistListSettings
}>
export type WorklistSpace = Readonly<{ id: string; name: string; description: string; archivedAt: string | null }>
export type WorklistFolder = Readonly<{ id: string; spaceId: string; name: string; archivedAt: string | null }>
export type WorklistTemplate = Readonly<{
    id: string
    name: string
    description: string
    statuses: readonly string[]
    tasks: readonly Readonly<{ title: string; description: string; status: string; priority: WorkItem['priority']; dueDateOffsetDays: number }>[]
}>
export type WorklistReadiness = Readonly<{ status: 'ready' | 'not_ready'; dependencies: Readonly<{ database: 'available' | 'unavailable' }> }>
export type WorklistAuthInput = Readonly<{ name: string; email: string; password: string; teamName: string }>
export type WorklistLoginInput = Readonly<{ email: string; password: string }>
export type SavedViewState = Readonly<{
    listId?: string
    search: string
    statusFilter: 'All' | string
    sortField: 'title' | 'status' | 'priority' | 'assignee' | 'dueDate'
    sortDirection: 'asc' | 'desc'
    groupBy: 'Off' | 'status' | 'priority' | 'assignee' | 'dueDate'
    visibleColumns: readonly ('status' | 'priority' | 'assignee' | 'dueDate')[]
    filters: readonly WorkItemFilter[]
    filterLogic: 'AND' | 'OR'
    columnWidths?: WorkItemColumnWidths
}>
export type SavedView = Readonly<{ id: string; name: string; visibility: 'private' | 'team'; canManage: boolean; state: SavedViewState }>
export type WorkItemComment = Readonly<{ id: string; authorId: string; authorName: string; body: string; createdAt: string }>
export type WorkItemListQuery = Readonly<{
    listId: string
    search: string
    status: 'All' | WorkItem['status']
    sortField: 'title' | 'status' | 'priority' | 'assignee' | 'dueDate'
    sortDirection: 'asc' | 'desc'
    filterLogic: 'AND' | 'OR'
    filters: readonly WorkItemFilter[]
    includeArchived?: boolean
}>
export type WorkItemPage = Readonly<{ items: readonly WorkItem[]; nextCursor: string | null }>
export type BulkDeleteResult = Readonly<{
    deletedCount: number
    results: readonly Readonly<{ itemId: string; outcome: 'deleted' | 'not_found' | 'failed' }>[]
}>
export type BulkUpdateResult = Readonly<{
    appliedCount: number
    results: readonly Readonly<{ itemId: string; outcome: 'applied' | 'not_found' | 'failed' }>[]
}>
export type WorkItemActivityRecord = Readonly<{ id: string; actorName: string; action: 'created' | 'updated' | 'commented' | 'deleted' | 'approval_requested' | 'approved' | 'changes_requested' | 'time_logged'; summary: string; createdAt: string }>
