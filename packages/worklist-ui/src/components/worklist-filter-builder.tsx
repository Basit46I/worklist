'use client'

import type { ReactElement } from 'react'
import { X } from 'lucide-react'
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
    <div className="mb-4 space-y-2 rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-medium text-slate-700">Filter tasks</p>
                <label className="flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-600">
                    Status
                    <select aria-label="Filter by status" className="bg-transparent text-sm text-slate-800 outline-none" onChange={(event) => { onStatusFilterChange(event.target.value) }} value={statusFilter}>
                        <option value="All">All statuses</option>
                        {activeStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                </label>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Match</span>
                <select
                    aria-label="Filter condition logic"
                    className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm"
                    onChange={(event) => {
                        onFilterLogicChange(event.target.value as 'AND' | 'OR')
                    }}
                    value={filterLogic}>
                    <option>AND</option>
                    <option>OR</option>
                </select>
                <Button className="h-8" onClick={onAddFilter} size="sm" variant="outline">
                    Add condition
                </Button>
            </div>
        </div>
        {filters.map((filter, index) => (
            <div className="flex flex-wrap items-center gap-2" key={`${String(index)}-${filter.field}`}>
                <select
                    aria-label={`Condition ${String(index + 1)} field`}
                    className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
                    onChange={(event) => {
                        const field = event.target.value as WorkItemFilter['field']
                        const value =
                            field === 'dueDate' ? new Date().toISOString().slice(0, 10) : field === 'status' ? 'To do' : field === 'priority' ? 'Low' : ''
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
                    className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
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
                        className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
                        onChange={(event) => {
                            onUpdateFilter(index, { value: event.target.value })
                        }}
                        value={filter.value}>
                        {activeStatuses.map((status) => <option key={status}>{status}</option>)}
                    </select>
                ) : filter.field === 'priority' ? (
                    <select
                        aria-label={`Condition ${String(index + 1)} value`}
                        className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
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
                        className="h-9 w-44"
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
                        className="h-9 w-44"
                        onChange={(event) => {
                            onUpdateFilter(index, { value: event.target.value })
                        }}
                        placeholder="Assignee name"
                        value={filter.value}
                    />
                )}
                <Button aria-label={`Remove condition ${String(index + 1)}`} className="size-8" onClick={() => {
                    onRemoveFilter(index)
                }} size="icon" type="button" variant="ghost">
                    <X aria-hidden="true" className="size-4" />
                </Button>
            </div>
        ))}
    </div>
)
