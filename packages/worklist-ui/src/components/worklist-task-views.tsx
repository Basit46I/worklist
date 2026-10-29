'use client'

import { useMemo, useRef, useState, type ReactElement } from 'react'
import { ChevronDown } from 'lucide-react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@workspace/ui/primitives'
import {
    type WorkItem,
    type WorkItemColumn,
    type WorkItemColumnWidths,
    type WorkItemActivityClient,
    type WorkItemApprovalClient,
    type WorkItemSortField,
    type WorklistCommentClient,
    type WorklistGroup,
    type WorklistListOption
} from '../model/index.js'
import { maxBulkSelection } from './worklist-presentation.js'
import { WorkItemRow } from './worklist-task-row.js'
import { WorklistTableHeader } from './worklist-table-header.js'

type SortField = WorkItemSortField
type VirtualListRow = Readonly<{ key: string; type: 'group'; title: string; count: number }> | Readonly<{ key: string; type: 'item'; item: WorkItem }>
const WorklistTable = ({
    groups,
    items,
    lists,
    statuses,
    columns,
    columnWidths,
    canEdit,
    selectedIds,
    commentRefreshSequence,
    commentRefreshItemId,
    commentClient,
    activityClient,
    approvalClient,
    onToggleSelect,
    onSelectLoaded,
    onReorderColumns,
    onResizeColumn,
    onSort,
    onDelete,
    onDuplicate,
    onToggleArchived,
    onUpdate,
    onCreateSubtask,
    sortField,
    direction
}: Readonly<{
    groups: readonly WorklistGroup[]
    items: readonly WorkItem[]
    lists: readonly WorklistListOption[]
    statuses: readonly string[]
    columns: readonly WorkItemColumn[]
    columnWidths: WorkItemColumnWidths
    canEdit: boolean
    selectedIds: ReadonlySet<string>
    commentRefreshSequence: number
    commentRefreshItemId: string | null
    commentClient: WorklistCommentClient
    activityClient: WorkItemActivityClient
    approvalClient: WorkItemApprovalClient
    onToggleSelect: (itemId: string, checked: boolean) => void
    onSelectLoaded: (itemIds: readonly string[], checked: boolean) => void
    onReorderColumns: (source: WorkItemColumn, target: WorkItemColumn) => void
    onResizeColumn: (column: WorkItemColumn, width: number) => void
    onSort: (field: SortField) => void
    onDelete: (itemId: string) => void
    onDuplicate: (itemId: string) => void
    onToggleArchived: (itemId: string, archived: boolean) => void
    onUpdate: (itemId: string, changes: Partial<WorkItem>) => void
    onCreateSubtask: (parentId: string, title: string) => void
    sortField: SortField
    direction: 'asc' | 'desc'
}>): ReactElement => {
    const scrollElement = useRef<HTMLDivElement>(null)
    const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set())
    const [collapsedGroups, setCollapsedGroups] = useState<ReadonlySet<string>>(new Set())
    const availableItems = items
    const rows = useMemo<readonly VirtualListRow[]>(
        () =>
            groups.flatMap((group) => [
                { key: `group:${group.key}`, type: 'group' as const, title: group.key, count: group.items.length },
                ...(collapsedGroups.has(group.key) ? [] : group.items.map((item) => ({ key: `item:${item.id}`, type: 'item' as const, item })))
            ]),
        [groups, collapsedGroups]
    )
    const loadedItemIds = useMemo(() => groups.flatMap((group) => group.items.map((item) => item.id)), [groups])
    const bulkEligibleIds = loadedItemIds.slice(0, maxBulkSelection)
    const eligibleSelectedCount = bulkEligibleIds.filter((itemId) => selectedIds.has(itemId)).length
    const virtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
        count: rows.length,
        getScrollElement: () => scrollElement.current,
        getItemKey: (index) => rows[index]?.key ?? index,
        estimateSize: () => 64,
        overscan: 10,
        useFlushSync: false
    })
    const virtualRows = virtualizer.getVirtualItems()
    const firstVirtualRow = virtualRows[0]
    const lastVirtualRow = virtualRows.at(-1)
    return (
        <div
            className="overflow-auto rounded-xl border border-[#d9e1d6] bg-white"
            ref={scrollElement}
            style={{ maxHeight: 'min(70vh, 720px)', minHeight: Math.min(320, Math.max(152, virtualizer.getTotalSize() + 56)) }}>
            <Table className="min-w-full table-fixed">
                <TableHeader className="sticky top-0 z-20 bg-[#f1f4ee]">
                    <WorklistTableHeader
                        bulkEligibleIds={bulkEligibleIds}
                        canEdit={canEdit}
                        columns={columns}
                        columnWidths={columnWidths}
                        direction={direction}
                        eligibleSelectedCount={eligibleSelectedCount}
                        onReorderColumns={onReorderColumns}
                        onResizeColumn={onResizeColumn}
                        onSelectLoaded={onSelectLoaded}
                        onSort={onSort}
                        sortField={sortField}
                    />
                </TableHeader>
                <TableBody>
                    {firstVirtualRow && firstVirtualRow.start > 0 && (
                        <TableRow
                            aria-hidden="true"
                            className="border-0 hover:bg-transparent">
                            <TableCell
                                colSpan={columns.length + 3}
                                style={{ height: firstVirtualRow.start, padding: 0 }}
                            />
                        </TableRow>
                    )}
                    {virtualRows.map((virtualRow) => {
                        const row = rows[virtualRow.index]
                        if (!row) return null
                        if (row.type === 'group')
                            return (
                                <TableRow
                                    className="border-b border-[#dde4da] bg-[#eaefe5] hover:bg-[#eaefe5]"
                                    data-index={virtualRow.index}
                                    key={virtualRow.key}
                                    ref={virtualizer.measureElement}>
                                    <TableCell
                                        className="py-2"
                                        colSpan={columns.length + 3}>
                                        <div className="flex items-center gap-2 px-2">
                                            <button
                                                aria-expanded={!collapsedGroups.has(row.title)}
                                                aria-label={`${collapsedGroups.has(row.title) ? 'Expand' : 'Collapse'} ${row.title} group`}
                                                className="flex items-center gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8aa37c]"
                                                onClick={() => {
                                                    setCollapsedGroups((current) => {
                                                        const next = new Set(current)
                                                        if (next.has(row.title)) next.delete(row.title)
                                                        else next.add(row.title)
                                                        return next
                                                    })
                                                }}
                                                type="button">
                                                <ChevronDown
                                                    aria-hidden="true"
                                                    className={`size-3.5 text-[#6f7e75] transition-transform ${collapsedGroups.has(row.title) ? '-rotate-90' : ''}`}
                                                />
                                                <span className="text-[13px] font-semibold text-[#2c4137]">{row.title}</span>
                                                <span className="text-[11px] font-medium text-[#7a887f]">{row.count}</span>
                                            </button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        return (
                            <WorkItemRow
                                canEdit={canEdit}
                                columnWidths={columnWidths}
                                columns={columns}
                                lists={lists}
                                availableItems={availableItems}
                                statuses={statuses}
                                commentClient={commentClient}
                                activityClient={activityClient}
                                approvalClient={approvalClient}
                                commentRefreshItemId={commentRefreshItemId}
                                commentRefreshSequence={commentRefreshSequence}
                                expanded={expandedIds.has(row.item.id)}
                                item={row.item}
                                key={virtualRow.key}
                                measureElement={virtualizer.measureElement}
                                onCreateSubtask={onCreateSubtask}
                                onDelete={onDelete}
                                onDuplicate={onDuplicate}
                                onToggleArchived={onToggleArchived}
                                onToggleExpanded={(itemId) => {
                                    setExpandedIds((current) => {
                                        const next = new Set(current)
                                        if (next.has(itemId)) next.delete(itemId)
                                        else next.add(itemId)
                                        return next
                                    })
                                }}
                                onUpdate={onUpdate}
                                onToggleSelect={onToggleSelect}
                                selected={selectedIds.has(row.item.id)}
                                selectionLimitReached={selectedIds.size >= maxBulkSelection}
                                virtualIndex={virtualRow.index}
                            />
                        )
                    })}
                    {lastVirtualRow && virtualizer.getTotalSize() > lastVirtualRow.end && (
                        <TableRow
                            aria-hidden="true"
                            className="border-0 hover:bg-transparent">
                            <TableCell
                                colSpan={columns.length + 3}
                                style={{ height: virtualizer.getTotalSize() - lastVirtualRow.end, padding: 0 }}
                            />
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    )
}

export { WorklistTable }
