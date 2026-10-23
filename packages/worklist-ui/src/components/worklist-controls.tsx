'use client'

import type { ReactElement } from 'react'
import { ArrowDownUp, Bookmark, BookmarkPlus, Columns3, ScanLine, Search, SlidersHorizontal } from 'lucide-react'
import { Button, Input } from '@workspace/ui/primitives'
import type { SavedViewOption, WorkItemColumn, WorkItemFilter, WorkItemSortField, WorkItemStatus } from '../model/index.js'
import { columnLabels } from './worklist-presentation.js'
import { WorklistFilterBuilder } from './worklist-filter-builder.js'

export type WorklistControlsProps = Readonly<{
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

export const WorklistControls = (props: WorklistControlsProps): ReactElement => (
    <>
        <section aria-label="Task controls" className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
                <label className="flex h-10 min-w-36 items-center gap-2 rounded-lg border border-[#dce4dc] bg-white px-3 text-[13px] text-[#30473a]">
                    <Bookmark aria-hidden="true" className="size-4 shrink-0 text-[#77877d]" />
                    <span className="sr-only">Open saved view</span>
                    <select aria-label="Open saved view" className="min-w-0 flex-1 bg-transparent font-medium outline-none" onChange={(event) => { props.onSavedViewChange(event.target.value) }} value={props.activeSavedViewId}>
                        <option value="">All tasks</option>
                        {props.savedViews.map((view) => <option key={view.id} value={view.id}>{view.name}</option>)}
                    </select>
                </label>
                <Button className="h-10 rounded-lg border-[#cbd9cd] bg-white px-3 text-[13px] text-[#355743] shadow-none hover:bg-[#f5f8f5]" onClick={props.onSaveView} variant="outline"><BookmarkPlus aria-hidden="true" className="size-4" /><span className="hidden sm:inline">Save view</span><span className="sm:hidden">Save</span></Button>
                <div className="relative min-w-[190px] flex-1 sm:max-w-[300px]">
                    <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#839087]" />
                    <Input aria-label="Search tasks" className="h-10 rounded-lg border-[#dce4dc] bg-white pl-9 pr-3 text-[13px] shadow-none placeholder:text-[#89958d]" onChange={(event) => { props.onSearchChange(event.target.value) }} placeholder="Search tasks…" value={props.search} />
                </div>
                {(props.search || props.statusFilter !== 'All' || props.filters.length > 0) && <Button className="h-9 px-2 text-xs text-[#66776c]" onClick={props.onClearFilters} variant="ghost">Clear filters</Button>}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button aria-expanded={props.filterBuilderOpen} className="h-10 rounded-lg border-[#dce4dc] bg-white px-3 text-[13px] text-[#42564a] shadow-none hover:bg-[#f5f8f5]" onClick={props.onFilterBuilderToggle} variant="outline"><SlidersHorizontal aria-hidden="true" className="size-4" />Filters{props.filters.length ? <span className="rounded-full bg-[#e7eee7] px-1.5 text-[10px]">{props.filters.length}</span> : null}</Button>
                <label className="flex h-10 items-center gap-2 rounded-lg border border-[#dce4dc] bg-white px-3 text-[13px] text-[#30473a]">
                    <span className="sr-only">Sort tasks by</span><ArrowDownUp aria-hidden="true" className="size-3.5 text-[#77877d]" />
                    <select aria-label="Sort tasks by" className="max-w-36 bg-transparent outline-none" onChange={(event) => { props.onSortChange(event.target.value as WorkItemSortField) }} value={props.sortField}>
                        <option value="dueDate">Sort: due date {props.sortDirection === 'asc' ? '↑' : '↓'}</option><option value="title">Sort: task name {props.sortDirection === 'asc' ? '↑' : '↓'}</option><option value="status">Sort: status</option><option value="priority">Sort: priority</option><option value="assignee">Sort: assignee</option>
                    </select>
                </label>
                <label className="flex h-10 items-center gap-2 rounded-lg border border-[#dce4dc] bg-white px-3 text-[13px] text-[#42564a]">
                    <ScanLine aria-hidden="true" className="size-3.5 text-[#77877d]" /><span className="sr-only">Group tasks by</span>
                    <select aria-label="Group tasks by" className="max-w-32 bg-transparent outline-none" onChange={(event) => { props.onGroupByChange(event.target.value as WorkItemColumn | 'Off') }} value={props.groupBy}><option value="Off">Group: off</option>{Object.entries(columnLabels).map(([column, label]) => <option key={column} value={column}>Group: {label.toLowerCase()}</option>)}</select>
                </label>
                {props.viewMode === 'list' && <Button aria-expanded={props.showColumnPicker} className="h-10 rounded-lg border-[#dce4dc] bg-white px-3 text-[13px] text-[#42564a] shadow-none hover:bg-[#f5f8f5]" onClick={props.onColumnPickerToggle} variant="outline"><Columns3 aria-hidden="true" className="size-3.5" />Columns · {props.visibleColumns.length + 1}</Button>}
            </div>
        </section>
        {props.filterBuilderOpen && <div className="mt-3"><WorklistFilterBuilder activeStatuses={props.activeStatuses} statusFilter={props.statusFilter} onStatusFilterChange={props.onStatusFilterChange} filters={props.filters} filterLogic={props.filterLogic} onAddFilter={props.onAddFilter} onFilterLogicChange={props.onFilterLogicChange} onRemoveFilter={props.onRemoveFilter} onUpdateFilter={props.onUpdateFilter} /></div>}
    </>
)
