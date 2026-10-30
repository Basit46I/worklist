'use client'

import type { ReactElement } from 'react'
import { ArrowDownUp, Bookmark, BookmarkPlus, Columns3, ScanLine, Search, SlidersHorizontal } from 'lucide-react'
import { Button, Dialog, DialogContent, DialogDescription, DialogTitle, Input } from '@workspace/ui/primitives'
import type { SavedViewOption, WorkItemColumn, WorkItemFilter, WorkItemSortField, WorkItemStatus } from '../model/index.js'
import { columnLabels } from './worklist-presentation.js'
import { WorklistFilterBuilder } from './worklist-filter-builder.js'

export type WorklistControlsProps = Readonly<{
    compact?: boolean
    search: string
    onSearchChange: (value: string) => void
    statusFilter: string
    onStatusFilterChange: (value: string) => void
    activeStatuses: readonly WorkItemStatus[]
    filters: readonly WorkItemFilter[]
    filterLogic: 'AND' | 'OR'
    onFilterLogicChange: (value: 'AND' | 'OR') => void
    filterBuilderOpen: boolean
    onFilterBuilderToggle: () => void
    onClearFilters: () => void
    onAddFilter: () => void
    onUpdateFilter: (index: number, changes: Partial<WorkItemFilter>) => void
    onRemoveFilter: (index: number) => void
    savedViews: readonly SavedViewOption[]
    activeSavedViewId: string
    onSavedViewChange: (viewId: string) => void
    onSaveView: () => void
    onUpdateSavedView: () => void
    onToggleSavedViewVisibility: () => void
    onDeleteSavedView: () => void
    viewMode: 'list' | 'board' | 'calendar'
    showColumnPicker: boolean
    onColumnPickerToggle: () => void
    visibleColumns: readonly WorkItemColumn[]
    onToggleColumn: (column: WorkItemColumn) => void
    groupBy: WorkItemColumn | 'Off'
    onGroupByChange: (value: WorkItemColumn | 'Off') => void
    sortField: WorkItemSortField
    sortDirection: 'asc' | 'desc'
    onSortChange: (field: WorkItemSortField) => void
}>

export const WorklistControls = (props: WorklistControlsProps): ReactElement => {
    const activeCount = props.filters.length + (props.statusFilter === 'All' ? 0 : 1)
    return (
        <section aria-label="Task controls" className="flex items-center gap-2">
            <div className="relative min-w-0">
                <Search aria-hidden="true" className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#8b8796]" />
                <Input aria-label="Search tasks" className="h-8 w-40 rounded-md border-[#e9e8ee] bg-white pl-8 text-xs shadow-none" onChange={(event) => { props.onSearchChange(event.target.value) }} placeholder="Search tasks…" value={props.search} />
            </div>
            <Dialog open={props.filterBuilderOpen} onOpenChange={(open) => { if (open !== props.filterBuilderOpen) props.onFilterBuilderToggle() }}>
                    <Button aria-expanded={props.filterBuilderOpen} className={`h-8 gap-2 rounded-md border-[#e9e8ee] px-3 text-xs shadow-none ${activeCount || props.filterBuilderOpen ? 'bg-[#f2efff] text-[#6c58bc]' : 'bg-white text-[#55515f]'}`} onClick={props.onFilterBuilderToggle} variant="outline">
                        <SlidersHorizontal aria-hidden="true" className="size-3.5" />Filter
                        {activeCount > 0 && <span className="grid min-w-4 place-items-center rounded bg-[#e4ddfb] px-1 text-[10px]">{activeCount}</span>}
                    </Button>
                <DialogContent aria-describedby="worklist-filter-description" aria-labelledby="worklist-filter-title" className="worklist-filter-panel fixed left-1/2 top-1/2 grid max-h-[calc(100dvh-32px)] w-[min(560px,calc(100vw-32px))] max-w-none -translate-x-1/2 -translate-y-1/2 grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-2xl border-[#e8e6ee] bg-white p-0 text-[#302c3d] shadow-[0_24px_80px_-24px_rgba(35,26,61,0.32)]">
                    <header className="border-b border-[#efedf3] px-5 py-4 pr-12">
                        <div><DialogTitle id="worklist-filter-title" className="flex items-center gap-2 text-sm font-semibold"><SlidersHorizontal aria-hidden="true" className="size-4 text-[#8c79c9]" />Filters & view</DialogTitle><DialogDescription id="worklist-filter-description" className="mt-1 text-xs text-[#918b9c]">Find the tasks you need. Changes apply instantly.</DialogDescription></div>
                    </header>
                    <div className="min-h-0 space-y-5 overflow-y-auto p-5">
                        <WorklistFilterBuilder activeStatuses={props.activeStatuses} statusFilter={props.statusFilter} onStatusFilterChange={props.onStatusFilterChange} filters={props.filters} filterLogic={props.filterLogic} onAddFilter={props.onAddFilter} onFilterLogicChange={props.onFilterLogicChange} onRemoveFilter={props.onRemoveFilter} onUpdateFilter={props.onUpdateFilter} />
                        <section aria-label="View settings" className="space-y-3 border-t border-[#efedf3] pt-4">
                            <h3 className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#96909f]">View settings</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <label className="grid gap-1.5 text-xs text-[#827b8f]"><span className="flex items-center gap-1.5"><ArrowDownUp aria-hidden="true" className="size-3" />Sort by</span><select aria-label="Sort tasks by" className="h-9 min-w-0 rounded-lg border border-[#e9e6ef] bg-white px-2 text-xs text-[#4b435a]" onChange={(event) => { props.onSortChange(event.target.value as WorkItemSortField) }} value={props.sortField}><option value="dueDate">Due date {props.sortDirection === 'asc' ? '↑' : '↓'}</option><option value="title">Task name</option><option value="status">Status</option><option value="priority">Priority</option><option value="assignee">Assignee</option></select></label>
                                <label className="grid gap-1.5 text-xs text-[#827b8f]"><span className="flex items-center gap-1.5"><ScanLine aria-hidden="true" className="size-3" />Group by</span><select aria-label="Group tasks by" className="h-9 min-w-0 rounded-lg border border-[#e9e6ef] bg-white px-2 text-xs text-[#4b435a]" onChange={(event) => { props.onGroupByChange(event.target.value as WorkItemColumn | 'Off') }} value={props.groupBy}><option value="Off">No grouping</option>{Object.entries(columnLabels).map(([column, label]) => <option key={column} value={column}>{label}</option>)}</select></label>
                            </div>
                            {props.viewMode === 'list' && <Button className="h-8 px-0 text-xs text-[#786c96]" onClick={() => { props.onColumnPickerToggle(); props.onFilterBuilderToggle() }} variant="ghost"><Columns3 aria-hidden="true" className="size-3.5" />Customize columns</Button>}
                        </section>
                        <section aria-label="Saved views" className="flex items-end gap-2 border-t border-[#efedf3] pt-4">
                            <label className="grid min-w-0 flex-1 gap-1.5 text-xs text-[#827b8f]"><span className="flex items-center gap-1.5"><Bookmark aria-hidden="true" className="size-3" />Saved view</span><select aria-label="Open saved view" className="h-9 min-w-0 rounded-lg border border-[#e9e6ef] bg-white px-2 text-xs text-[#4b435a]" onChange={(event) => { props.onSavedViewChange(event.target.value) }} value={props.activeSavedViewId}><option value="">All tasks</option>{props.savedViews.map((view) => <option key={view.id} value={view.id}>{view.name}</option>)}</select></label>
                            <Button className="h-9 rounded-lg border-[#e9e6ef] text-xs shadow-none" onClick={props.onSaveView} variant="outline"><BookmarkPlus aria-hidden="true" className="size-3.5" />Save view</Button>
                        </section>
                    </div>
                    <footer className="flex items-center justify-between border-t border-[#efedf3] bg-[#faf9fc] px-5 py-3">
                        <Button disabled={!activeCount && !props.search} className="h-8 px-0 text-xs text-[#8b819d]" onClick={props.onClearFilters} variant="ghost">Clear filters</Button>
                        <Button className="h-8 rounded-lg bg-[#30293f] px-5 text-xs text-white hover:bg-[#463954]" onClick={props.onFilterBuilderToggle}>Done</Button>
                    </footer>
                </DialogContent>
            </Dialog>
        </section>
    )
}
