'use client'

import { useRef, type PointerEvent as ReactPointerEvent, type ReactElement } from 'react'
import { ArrowDown, ArrowDownUp, ArrowUp } from 'lucide-react'
import { Checkbox, TableHead, TableRow } from '@workspace/ui/primitives'
import type { WorkItemColumn, WorkItemColumnWidths, WorkItemSortField } from '../model/index.js'
import { columnLabels, maxBulkSelection } from './worklist-presentation.js'

type SortIconProps = Readonly<{ field: WorkItemSortField; sortField: WorkItemSortField; direction: 'asc' | 'desc' }>
const SortIcon = ({ field, sortField, direction }: SortIconProps): ReactElement => {
    if (field !== sortField) return <ArrowDownUp aria-hidden="true" className="size-3 opacity-0 transition-opacity group-hover/sort:opacity-45 group-focus-visible/sort:opacity-45" />
    return direction === 'asc' ? <ArrowUp aria-hidden="true" className="size-3" /> : <ArrowDown aria-hidden="true" className="size-3" />
}

export type WorklistTableHeaderProps = Readonly<{
    columns: readonly WorkItemColumn[]
    columnWidths: WorkItemColumnWidths
    canEdit: boolean
    bulkEligibleIds: readonly string[]
    eligibleSelectedCount: number
    onSelectLoaded: (itemIds: readonly string[], checked: boolean) => void
    onReorderColumns: (source: WorkItemColumn, target: WorkItemColumn) => void
    onResizeColumn: (column: WorkItemColumn, width: number) => void
    onSort: (field: WorkItemSortField) => void
    sortField: WorkItemSortField
    direction: 'asc' | 'desc'
}>

export const WorklistTableHeader = ({
    columns, columnWidths, canEdit, bulkEligibleIds, eligibleSelectedCount, onSelectLoaded,
    onReorderColumns, onResizeColumn, onSort, sortField, direction
}: WorklistTableHeaderProps): ReactElement => {
    const resizing = useRef<Readonly<{ column: WorkItemColumn; pointerId: number; startX: number; startWidth: number }> | null>(null)
    const startResize = (event: ReactPointerEvent<HTMLSpanElement>, column: WorkItemColumn): void => {
        event.preventDefault()
        event.stopPropagation()
        resizing.current = { column, pointerId: event.pointerId, startX: event.clientX, startWidth: columnWidths[column] }
        event.currentTarget.setPointerCapture(event.pointerId)
    }
    const moveResize = (event: ReactPointerEvent<HTMLSpanElement>): void => {
        const current = resizing.current
        if (current && current.pointerId === event.pointerId) {
            onResizeColumn(current.column, Math.max(100, Math.min(480, Math.round(current.startWidth + event.clientX - current.startX))))
        }
    }
    const finishResize = (event: ReactPointerEvent<HTMLSpanElement>): void => {
        if (resizing.current?.pointerId === event.pointerId) resizing.current = null
    }

    return <TableRow className="h-9 border-b border-[#dde4da] bg-[#f1f4ee] hover:bg-[#f1f4ee]">
        <TableHead className="w-12 pl-4 pr-1"><Checkbox
            aria-label={`Select up to ${String(maxBulkSelection)} loaded tasks`}
            checked={bulkEligibleIds.length > 0 && eligibleSelectedCount === bulkEligibleIds.length ? true : eligibleSelectedCount > 0 ? 'indeterminate' : false}
            disabled={!canEdit || bulkEligibleIds.length === 0}
            onCheckedChange={(checked) => { onSelectLoaded(bulkEligibleIds, checked === true) }}
        /></TableHead>
        <TableHead className="min-w-64 bg-[#f1f4ee]"><button
            className="group/sort flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[#728077] hover:text-[#263329] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8aa37c]"
            onClick={() => { onSort('title') }} type="button">Task / subtasks{' '}<SortIcon direction={direction} field="title" sortField={sortField} /></button></TableHead>
        {columns.map((column) => <TableHead
            className={`relative bg-[#f1f4ee] ${column === 'dueDate' ? 'pr-6' : ''}`}
            draggable key={column}
            onDragOver={(event) => { event.preventDefault() }}
            onDrop={(event) => { event.preventDefault(); const source = event.dataTransfer.getData('text/worklist-column'); if (source) onReorderColumns(source as WorkItemColumn, column) }}
            style={{ width: columnWidths[column], minWidth: columnWidths[column] }}>
            <div className="flex items-center justify-between gap-2 pr-2"><button
                className="group/sort flex min-w-0 items-center gap-1.5 truncate text-[10px] font-medium uppercase tracking-[0.08em] text-[#728077] hover:text-[#263329] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8aa37c]"
                draggable onClick={() => { onSort(column) }} onDragStart={(event) => { event.dataTransfer.setData('text/worklist-column', column) }} type="button">
                {columnLabels[column]}{' '}<SortIcon direction={direction} field={column} sortField={sortField} />
            </button><span
                aria-label={`Resize ${columnLabels[column]} column`} aria-orientation="vertical" aria-valuemax={480} aria-valuemin={100} aria-valuenow={columnWidths[column]}
                className="absolute right-0 top-1/2 z-10 h-7 w-2 -translate-y-1/2 touch-none cursor-col-resize rounded-sm hover:bg-emerald-300 focus-visible:bg-emerald-400 focus-visible:outline-none"
                onKeyDown={(event) => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); onResizeColumn(column, Math.max(100, Math.min(480, columnWidths[column] + (event.key === 'ArrowRight' ? 10 : -10)))) } }}
                onPointerDown={(event) => { startResize(event, column) }} onPointerMove={moveResize} onPointerUp={finishResize} onPointerCancel={finishResize} role="separator" tabIndex={0}
            /></div>
        </TableHead>)}
        <TableHead className="w-10 bg-[#f1f4ee]" />
    </TableRow>
}
