'use client'

import { useState, type ReactElement } from 'react'
import { Archive, Check, ChevronDown, Copy, MoreHorizontal, Pencil, RotateCcw, Square, Trash2, X } from 'lucide-react'
import { Button, Checkbox, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Input, TableCell, TableRow } from '@workspace/ui/primitives'
import type {
    WorkItem,
    WorkItemColumn,
    WorkItemColumnWidths,
    WorkItemActivityClient,
    WorkItemApprovalClient,
    WorklistCommentClient,
    WorklistListOption
} from '../model/index.js'
import { isCompletedStatus } from './worklist-presentation.js'
import { WorkItemFieldCells } from './work-item-field-cells.js'
import { WorkItemExpandedDetails } from './work-item-expanded-details.js'

export const WorkItemRow = ({
    item,
    availableItems,
    lists,
    statuses,
    columns,
    columnWidths,
    canEdit,
    selected,
    selectionLimitReached,
    expanded,
    virtualIndex,
    commentRefreshSequence,
    commentRefreshItemId,
    commentClient,
    activityClient,
    approvalClient,
    onToggleExpanded,
    onToggleSelect,
    onDelete,
    onDuplicate,
    onToggleArchived,
    onUpdate,
    onCreateSubtask,
    measureElement
}: Readonly<{
    item: WorkItem
    availableItems: readonly WorkItem[]
    lists: readonly WorklistListOption[]
    statuses: readonly string[]
    columns: readonly WorkItemColumn[]
    columnWidths: WorkItemColumnWidths
    canEdit: boolean
    selected: boolean
    selectionLimitReached: boolean
    expanded: boolean
    virtualIndex: number
    commentRefreshSequence: number
    commentRefreshItemId: string | null
    commentClient: WorklistCommentClient
    activityClient: WorkItemActivityClient
    approvalClient: WorkItemApprovalClient
    onToggleExpanded: (itemId: string) => void
    onToggleSelect: (itemId: string, checked: boolean) => void
    onDelete: (itemId: string) => void
    onDuplicate: (itemId: string) => void
    onToggleArchived: (itemId: string, archived: boolean) => void
    onUpdate: (itemId: string, changes: Partial<WorkItem>) => void
    onCreateSubtask: (parentId: string, title: string) => void
    measureElement: (element: HTMLTableRowElement | null) => void
}>): ReactElement => {
    const [isEditing, setIsEditing] = useState(false)
    const [draftTitle, setDraftTitle] = useState(item.title)
    const subtasks = availableItems.filter((candidate) => candidate.parentId === item.id)
    const completedSubtasks = subtasks.filter((subtask) => isCompletedStatus(subtask.status)).length

    const saveTitle = (): void => {
        const title = draftTitle.trim()
        if (title) onUpdate(item.id, { title })
        setDraftTitle(title || item.title)
        setIsEditing(false)
    }


    return (
        <TableRow
            className={`group border-b border-[#e9eee7] transition-colors ${selected ? 'bg-[#e6efe1] hover:bg-[#e6efe1]' : 'bg-white hover:bg-[#f8faf6]'}`}
            data-index={virtualIndex}
            ref={measureElement}>
            <TableCell className="w-12 pl-4 pr-1">
                <Checkbox
                    aria-label={`Select ${item.title}`}
                    checked={selected}
                    disabled={!canEdit || (!selected && selectionLimitReached)}
                    onCheckedChange={(checked) => {
                        onToggleSelect(item.id, checked === true)
                    }}
                />
            </TableCell>
            <TableCell className="min-w-64 py-3 font-medium text-[#233a2f]">
                {isEditing ? (
                    <form
                        className="flex items-center gap-1.5"
                        onSubmit={(event) => {
                            event.preventDefault()
                            saveTitle()
                        }}>
                        <Input
                            aria-label={`Edit ${item.title}`}
                            autoFocus
                            className="h-8 min-w-32"
                            onChange={(event) => {
                                setDraftTitle(event.target.value)
                            }}
                            value={draftTitle}
                        />
                        <Button
                            aria-label="Save task title"
                            className="size-8"
                            onClick={saveTitle}
                            size="icon"
                            type="button"
                            variant="ghost">
                            <Check aria-hidden="true" />
                        </Button>
                        <Button
                            aria-label="Cancel title edit"
                            className="size-8"
                            onClick={() => {
                                setDraftTitle(item.title)
                                setIsEditing(false)
                            }}
                            size="icon"
                            type="button"
                            variant="ghost">
                            <X aria-hidden="true" />
                        </Button>
                    </form>
                ) : (
                    <div className="min-w-0">
                        <div className="flex min-w-0 flex-col gap-0.5">
                            <span className="flex min-w-0 items-center gap-1.5">
                                <button
                                    aria-expanded={expanded}
                                    aria-label={`${expanded ? 'Collapse' : 'Expand'} ${item.title}`}
                                    className={`min-w-0 truncate rounded-sm text-left text-sm font-medium text-[#233a2f] hover:text-[#174638] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8aa37c] ${item.parentId ? 'font-normal text-[#4d5f54]' : ''}`}
                                    onClick={() => { onToggleExpanded(item.id) }}
                                    type="button">
                                    {item.parentId ? '↳ ' : ''}{item.title}
                                </button>
                                {canEdit && <Button aria-label={`Edit ${item.title}`} className="size-6 shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100" onClick={() => { setIsEditing(true) }} size="icon" type="button" variant="ghost"><Pencil aria-hidden="true" className="size-3" /></Button>}
                            </span>
                            <button
                                aria-expanded={expanded}
                                aria-label={`${expanded ? 'Hide' : 'Show'} details for ${item.title}`}
                                className="flex w-fit items-center gap-1 rounded-sm text-[11px] font-normal text-[#7a887f] hover:text-[#34483b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8aa37c]"
                                onClick={() => { onToggleExpanded(item.id) }}
                                type="button">
                                <ChevronDown aria-hidden="true" className={`size-3 transition-transform ${expanded ? '' : '-rotate-90'}`} />
                                {!item.parentId && subtasks.length > 0 ? `${String(completedSubtasks)}/${String(subtasks.length)} subtasks` : 'Details'}
                            </button>
                        </div>
                        {expanded && !item.parentId && subtasks.length > 0 && (
                            <ul aria-label={`Subtasks for ${item.title}`} className="mt-2 space-y-2 pb-1 pl-6">
                                {subtasks.map((subtask) => (
                                    <li className="flex min-w-0 items-center gap-2.5 text-[13px] font-normal text-[#34463b]" key={subtask.id}>
                                        {isCompletedStatus(subtask.status)
                                            ? <Check aria-label="Completed" className="size-3.5 shrink-0 text-[#4b6b57]" />
                                            : <Square aria-hidden="true" className="size-3.5 shrink-0 text-[#7a887f]" />}
                                        <span className="min-w-0 flex-1 truncate">{subtask.title}</span>
                                        <span className="shrink-0 text-[11px] text-[#7a887f]">{subtask.status}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
                <WorkItemExpandedDetails activityClient={activityClient} approvalClient={approvalClient} availableItems={availableItems} canEdit={canEdit} commentClient={commentClient} commentRefreshItemId={commentRefreshItemId} commentRefreshSequence={commentRefreshSequence} expanded={expanded} item={item} lists={lists} onCreateSubtask={onCreateSubtask} onUpdate={onUpdate} />
            </TableCell>
            <TableCell className="worklist-description-cell"><span className="line-clamp-2 whitespace-normal">{item.description || '-'}</span></TableCell>
            <WorkItemFieldCells canEdit={canEdit} columnWidths={columnWidths} columns={columns} item={item} onUpdate={onUpdate} statuses={statuses} />
            <TableCell className="w-8 px-1">
                {canEdit && item.archivedAt ? <Button aria-label={`Restore ${item.title}`} className="h-7 px-1 text-[10px]" onClick={() => { onToggleArchived(item.id, false) }} variant="ghost"><RotateCcw aria-hidden="true" className="size-3" />Restore</Button> : canEdit && <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button aria-label={`Actions for ${item.title}`} className="size-7 text-slate-400" size="icon" variant="ghost"><MoreHorizontal aria-hidden="true" className="size-3.5" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => { setIsEditing(true) }}><Pencil />Edit task</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => { onDuplicate(item.id) }}><Copy />Duplicate</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => { onToggleArchived(item.id, !item.archivedAt) }}>{item.archivedAt ? <RotateCcw /> : <Archive />}{item.archivedAt ? 'Restore' : 'Archive'}</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => { onDelete(item.id) }}><Trash2 />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>}
            </TableCell>
        </TableRow>
    )
}
