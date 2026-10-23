'use client'

import type { ReactElement } from 'react'
import { Archive, Plus, RotateCcw, Search } from 'lucide-react'
import { Button } from '@workspace/ui/primitives'
import { WorklistBoard, WorklistTable } from '@workspace/worklist-ui'
import type { WorklistGroup } from '@workspace/worklist-ui'
import { createWorkItemComment, fetchWorkItemComments, fetchWorkItemActivity } from '../api'
import type { useWorklistPageState } from '../use-worklist-page-state'
import type { useWorklistListActions } from '../use-worklist-list-actions'
import type { useWorklistViewActions } from '../use-worklist-view-actions'
import type { useWorklistItemActions } from '../use-worklist-item-actions'
import type { useWorklistBulkActions } from '../use-worklist-bulk-actions'
import { canEditWorkspace } from '../permissions'
import { summarizeDashboardItems } from '../dashboard-model'
import { DashboardStatCards } from './dashboard-panels'
import { CalendarViewPanel } from './calendar-page'

export type WorklistResultsPanelProps = Readonly<{
    state: ReturnType<typeof useWorklistPageState>
    data: Readonly<{
        activeStatuses: readonly string[]
        filteredItems: ReturnType<typeof useWorklistPageState>['items']
        groups: readonly WorklistGroup[]
        isListLoaded: boolean
        itemsLoading: boolean
        loadingMoreItems: boolean
        visibleSelectedIds: ReadonlySet<string>
    }>
    actions: Readonly<{
        lists: ReturnType<typeof useWorklistListActions>
        views: ReturnType<typeof useWorklistViewActions>
        items: ReturnType<typeof useWorklistItemActions>
        bulk: ReturnType<typeof useWorklistBulkActions>
    }>
    user: NonNullable<ReturnType<typeof useWorklistPageState>['user']>
}>

const commentClient = { list: fetchWorkItemComments, create: createWorkItemComment } as const
const activityClient = { list: fetchWorkItemActivity } as const

export const WorklistResultsPanel = ({ state, data, actions, user }: WorklistResultsPanelProps): ReactElement => {
    const { search, statusFilter, filters, setSearch, setStatusFilter, setFilters, setFilterLogic, setActiveSavedViewId, setShowNewItem, setNewStatus, viewMode, lists, visibleColumns, columnWidths, commentRefresh, nextCursor, sortDirection, sortField, includeArchivedItems, setIncludeArchivedItems } = state
    const { activeStatuses, filteredItems, groups, isListLoaded, itemsLoading, loadingMoreItems, visibleSelectedIds } = data
    const { selectLoadedItems, toggleSelected, loadMoreItems } = actions.bulk
    const { handleSort, reorderColumns, resizeColumn } = actions.views
    const { createSubtask, updateItem, deleteItem, duplicateItem, toggleArchived } = actions.items
    const topLevelCount = filteredItems.filter((item) => !item.parentId).length
    const subtaskCount = filteredItems.length - topLevelCount
    const fieldLabel = { title: 'Task names', status: 'Statuses', priority: 'Priorities', assignee: 'Assignees', dueDate: 'Due dates' }[sortField]
    const sortSummary = `${fieldLabel} ${sortDirection === 'asc' ? 'ascending' : 'descending'}${state.groupBy === 'Off' ? '' : ` within each ${state.groupBy === 'dueDate' ? 'due date' : state.groupBy}`}`
    return (
        <>
            <section aria-label="Project tasks" className="overflow-hidden">
            {viewMode === 'list' && <div className="flex justify-end border-b border-[#e8ede6] bg-[#fbfcfa] px-3 py-2">
                <Button className="h-8 gap-1.5 rounded-md border-[#dce4da] bg-white px-2.5 text-xs font-medium text-[#526b58] shadow-none hover:border-[#b8cbbd] hover:bg-[#edf4ed] hover:text-[#245d43]" onClick={() => setIncludeArchivedItems((value) => !value)} variant="outline">
                    {includeArchivedItems ? <RotateCcw aria-hidden="true" className="size-3.5" /> : <Archive aria-hidden="true" className="size-3.5" />}
                    {includeArchivedItems ? 'Back to active tasks' : 'Show archived tasks'}
                </Button>
            </div>}
            {itemsLoading ? (
                    <div className="grid min-h-72 place-items-center bg-white text-sm text-[#718076]">
                        <span className="flex items-center gap-3">
                            <span
                                className="size-4 animate-spin rounded-full border-2 border-[#dce5d6] border-t-[#668356]"
                                aria-hidden="true"
                            />
                            Loading your tasks…
                        </span>
                    </div>
                ) : groups.length === 0 ? (
                    <div className="grid min-h-80 place-items-center bg-white px-5 py-12 text-center">
                        <div>
                            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#eef4e9]">
                                <Search
                                    aria-hidden="true"
                                    className="size-5 text-[#668356]"
                                />
                            </div>
                            <p className="mt-4 text-lg font-semibold tracking-tight text-[#253328]">
                                {includeArchivedItems
                                    ? 'No archived tasks'
                                    : search || statusFilter !== 'All' || filters.length > 0
                                      ? 'No tasks match these filters'
                                      : 'Your workspace is ready'}
                            </p>
                            <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-[#758078]">
                                {includeArchivedItems
                                    ? 'Archived tasks from this list will appear here. Switch back to active tasks when you are done.'
                                    : search || statusFilter !== 'All' || filters.length > 0
                                      ? 'Try a different search or clear the filters to see more of your team’s work.'
                                      : 'Create the first task to give your team a clear next step.'}
                            </p>
                            {search || statusFilter !== 'All' || filters.length > 0 ? (
                                <Button
                                    className="mt-5 h-10 rounded-xl px-4 text-[#344e37]"
                                    onClick={() => {
                                        setSearch('')
                                        setStatusFilter('All')
                                        setFilters([])
                                        setFilterLogic('AND')
                                        setActiveSavedViewId('')
                                    }}
                                    variant="outline">
                                    Clear filters
                                </Button>
                            ) : (
                                !includeArchivedItems && canEditWorkspace(user.role) && (
                                    <Button
                                        className="mt-5 h-10 rounded-xl bg-[#243b2c] px-4 text-white hover:bg-[#314b37]"
                                        onClick={() => setShowNewItem(true)}>
                                        <Plus
                                            aria-hidden="true"
                                            className="size-4"
                                        />{' '}
                                        Add your first task
                                    </Button>
                                )
                            )}
                        </div>
                    </div>
                ) : viewMode === 'board' ? (
                    <WorklistBoard
                        canEdit={canEditWorkspace(user.role)}
                        items={filteredItems}
                        lists={lists}
                        statuses={activeStatuses}
                        onAddTask={(status) => {
                            setNewStatus(status)
                            setShowNewItem(true)
                        }}
                        onUpdate={updateItem}
                    />
                ) : viewMode === 'calendar' ? (
                    <div className="space-y-4">
                        <CalendarViewPanel canEdit={canEditWorkspace(user.role)} hasMoreItems={Boolean(nextCursor)} items={filteredItems} loading={itemsLoading} loadingMoreItems={loadingMoreItems} onLoadMore={loadMoreItems} onUpdate={updateItem} />
                        <DashboardStatCards metrics={summarizeDashboardItems(filteredItems, new Date().toISOString().slice(0, 10))} scopeLabel="Based on tasks loaded in this view" />
                    </div>
                ) : (
                    <div className="pt-1">
                        <WorklistTable
                            canEdit={canEditWorkspace(user.role)}
                            columnWidths={columnWidths}
                            columns={visibleColumns}
                            commentClient={commentClient}
                            activityClient={activityClient}
                            commentRefreshItemId={commentRefresh.itemId}
                            commentRefreshSequence={commentRefresh.sequence}
                            direction={sortDirection}
                            groups={groups}
                            items={state.items}
                            lists={lists}
                            statuses={activeStatuses}
                            onCreateSubtask={createSubtask}
                            onDelete={deleteItem}
                            onDuplicate={duplicateItem}
                            onToggleArchived={toggleArchived}
                            onResizeColumn={resizeColumn}
                            onSelectLoaded={selectLoadedItems}
                            onSort={handleSort}
                            onUpdate={updateItem}
                            onToggleSelect={toggleSelected}
                            onReorderColumns={reorderColumns}
                            selectedIds={visibleSelectedIds}
                            sortField={sortField}
                        />
                    </div>
                )}

                {isListLoaded && nextCursor && (
                    <div className="mt-5 flex flex-col items-center gap-2">
                        <Button
                            disabled={loadingMoreItems}
                            onClick={loadMoreItems}
                            variant="outline">
                            {loadingMoreItems ? 'Loading…' : 'Load more tasks'}
                        </Button>
                        <p className="text-xs text-slate-400">
                            Search, filters, and sorting apply across the full team list. Showing {filteredItems.length} matching tasks so far.
                        </p>
                    </div>
                )}
            </section>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-[#6f7e75]">
                    <p>
                        {topLevelCount} top-level {topLevelCount === 1 ? 'task' : 'tasks'} · {subtaskCount} {subtaskCount === 1 ? 'subtask' : 'subtasks'}
                        {viewMode === 'list' ? ` · ${sortSummary}` : ''}
                    </p>
                </div>
        </>
    )
}
