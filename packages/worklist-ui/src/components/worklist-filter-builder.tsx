'use client'

import type { ReactElement } from 'react'
import { Plus, X } from 'lucide-react'
import { Button, Input } from '@workspace/ui/primitives'
import type { WorkItemFilter, WorkItemStatus } from '../model/index.js'

export type WorklistFilterBuilderProps = Readonly<{
    activeStatuses: readonly WorkItemStatus[]
    statusFilter: string
    onStatusFilterChange: (value: string) => void
    filters: readonly WorkItemFilter[]
    filterLogic: 'AND' | 'OR'
    onFilterLogicChange: (value: 'AND' | 'OR') => void
    onAddFilter: () => void
    onUpdateFilter: (index: number, changes: Partial<WorkItemFilter>) => void
    onRemoveFilter: (index: number) => void
}>

export const WorklistFilterBuilder = ({
    activeStatuses,
    statusFilter,
    onStatusFilterChange,
    filters,
    filterLogic,
    onFilterLogicChange,
    onAddFilter,
    onUpdateFilter,
    onRemoveFilter
}: WorklistFilterBuilderProps): ReactElement => (
    <div className="worklist-filter-builder space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <label className="grid gap-1.5 text-[11px] font-medium text-[#827b8f]">
                <span>Status</span>
                <select aria-label="Filter by status" className="h-9 w-full rounded-lg border border-[#e7e3ed] bg-white px-3 text-xs text-[#423b50]" onChange={(event) => { onStatusFilterChange(event.target.value) }} value={statusFilter}>
                    <option value="All">All statuses</option>
                    {activeStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
            </label>
            <label className="grid gap-1.5 text-[11px] font-medium text-[#827b8f]">
                <span>Match conditions</span>
                <select aria-label="Filter condition logic" className="h-9 w-full rounded-lg border border-[#e7e3ed] bg-white px-3 text-xs text-[#423b50]" onChange={(event) => { onFilterLogicChange(event.target.value as 'AND' | 'OR') }} value={filterLogic}>
                    <option value="AND">All conditions must match</option>
                    <option value="OR">Any condition can match</option>
                </select>
            </label>
        </div>
        {filters.length === 0 && <div className="rounded-xl border border-dashed border-[#e8e3ef] bg-[#fcfbfd] px-4 py-5 text-center"><p className="text-xs leading-5 text-[#9990a5]">No extra conditions yet. Narrow results by priority, assignee or due date.</p><Button className="mt-3 h-8 gap-1.5 rounded-lg border-[#e7e1f0] bg-white px-3 text-xs text-[#7867a5] shadow-none hover:bg-[#f5f1fc]" onClick={onAddFilter} size="sm" variant="outline"><Plus aria-hidden="true" className="size-3.5" />Add condition</Button></div>}
        {filters.map((filter, index) => (
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,.8fr)_32px] gap-2 rounded-xl border border-[#efedf3] bg-[#faf9fc] p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,.8fr)_minmax(0,1.2fr)_28px]" key={`${String(index)}-${filter.field}`}>
                <select
                    aria-label={`Condition ${String(index + 1)} field`}
                    className="h-9 min-w-0 w-full rounded-lg border border-[#e7e3ed] bg-white px-2 text-xs"
                    onChange={(event) => {
                        const field = event.target.value as WorkItemFilter['field']
                        const value =
                            field === 'dueDate' ? new Date().toISOString().slice(0, 10) : field === 'status' ? activeStatuses[0] ?? '' : field === 'priority' ? 'Low' : ''
                        onUpdateFilter(index, { field, operator: field === 'assignee' ? 'contains' : 'equals', value })
                    }}
                    value={filter.field}>
                    <option value="status">Status</option>
                    <option value="priority">Priority</option>
                    <option value="assignee">Assignee</option>
                    <option value="dueDate">Due date</option>
                </select>
                <select
                    aria-label={`Condition ${String(index + 1)} operator`}
                    className="h-9 min-w-0 w-full rounded-lg border border-[#e7e3ed] bg-white px-2 text-xs"
                    onChange={(event) => {
                        onUpdateFilter(index, { operator: event.target.value as WorkItemFilter['operator'] })
                    }}
                    value={filter.operator}>
                    <option value="equals">is</option>
                    {filter.field === 'assignee' && <option value="contains">contains</option>}
                    {filter.field === 'dueDate' && (
                        <>
                            <option value="before">is before</option>
                            <option value="after">is after</option>
                        </>
                    )}
                </select>
                {filter.field === 'status' ? (
                    <select
                        aria-label={`Condition ${String(index + 1)} value`}
                        className="h-9 min-w-0 w-full rounded-lg border border-[#e7e3ed] bg-white px-2 text-xs"
                        onChange={(event) => {
                            onUpdateFilter(index, { value: event.target.value })
                        }}
                        value={filter.value}>
                        {activeStatuses.map((status) => <option key={status}>{status}</option>)}
                    </select>
                ) : filter.field === 'priority' ? (
                    <select
                        aria-label={`Condition ${String(index + 1)} value`}
                        className="h-9 min-w-0 w-full rounded-lg border border-[#e7e3ed] bg-white px-2 text-xs"
                        onChange={(event) => {
                            onUpdateFilter(index, { value: event.target.value })
                        }}
                        value={filter.value}>
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                    </select>
                ) : filter.field === 'dueDate' ? (
                    <Input
                        aria-label={`Condition ${String(index + 1)} value`}
                        className="h-9 min-w-0 w-full rounded-lg border-[#e7e3ed] bg-white text-xs"
                        onChange={(event) => {
                            onUpdateFilter(index, { value: event.target.value })
                        }}
                        required
                        type="date"
                        value={filter.value}
                    />
                ) : (
                    <Input
                        aria-label={`Condition ${String(index + 1)} value`}
                        className="h-9 min-w-0 w-full rounded-lg border-[#e7e3ed] bg-white text-xs"
                        onChange={(event) => {
                            onUpdateFilter(index, { value: event.target.value })
                        }}
                        placeholder="Name or email"
                        value={filter.value}
                    />
                )}
                <Button aria-label={`Remove condition ${String(index + 1)}`} className="col-start-3 row-start-1 size-8 justify-self-end text-[#a097ae] hover:bg-[#f5e9ee] hover:text-[#b65a76] sm:col-start-4" onClick={() => {
                    onRemoveFilter(index)
                }} size="icon" type="button" variant="ghost">
                    <X aria-hidden="true" className="size-4" />
                </Button>
            </div>
        ))}
        {filters.length > 0 && <div className="flex justify-between"><p className="self-center text-[11px] text-[#9990a5]">{filters.length} of 10 conditions</p><Button className="h-8 gap-1.5 rounded-lg px-2 text-xs text-[#8470b2] hover:bg-[#f5f1fc]" onClick={onAddFilter} size="sm" variant="ghost"><Plus aria-hidden="true" className="size-3.5" />Add condition</Button></div>}
    </div>
)
