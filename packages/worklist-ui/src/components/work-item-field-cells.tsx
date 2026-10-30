'use client'

import { Fragment, useState, type ReactElement } from 'react'
import { Check, Pencil, X } from 'lucide-react'
import { Button, Input, Popover, PopoverContent, PopoverTrigger, TableCell } from '@workspace/ui/primitives'
import type { WorkItem, WorkItemColumn, WorkItemColumnWidths, WorkItemPriority } from '../model/index.js'
import { formatDate, initialsOf, isOverdue, statusDotStyle, statusStyle } from './worklist-presentation.js'

const priorityTextStyle: Readonly<Record<WorkItemPriority, string>> = {
    Low: 'text-[#6b776f]',
    Medium: 'text-[#6b776f]',
    High: 'text-[#b4503d]'
}

type WorkItemFieldCellsProps = Readonly<{
    item: WorkItem
    columns: readonly WorkItemColumn[]
    columnWidths: WorkItemColumnWidths
    statuses: readonly string[]
    canEdit: boolean
    onUpdate: (itemId: string, changes: Partial<WorkItem>) => void
}>

export const WorkItemFieldCells = ({ item, columns, columnWidths, statuses, canEdit, onUpdate }: WorkItemFieldCellsProps): ReactElement => {
    const [isEditingAssignee, setIsEditingAssignee] = useState(false)
    const [draftAssignee, setDraftAssignee] = useState(item.assigneeEmail ?? '')
    const [isEditingDueDate, setIsEditingDueDate] = useState(false)
    const [draftDueDate, setDraftDueDate] = useState(item.dueDate)
    return (
        <>{columns.map((column) => (<Fragment key={column}>
                <TableCell
                    className={`py-3.5 ${column === 'dueDate' ? 'pr-6' : ''}`}
                    key={column}
                    style={{ width: columnWidths[column], minWidth: columnWidths[column] }}>
                    {column === 'status' ? (
                        <label className={`inline-flex items-center gap-1.5 rounded-md py-1 pl-2 pr-1 text-xs font-medium focus-within:ring-2 focus-within:ring-[#8aa37c] ${statusStyle(item.status)}`}>
                            <span className="sr-only">Status for {item.title}</span>
                            <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${statusDotStyle(item.status)}`} />
                            <select
                                aria-label={`Status for ${item.title}`}
                                className="max-w-[8.5rem] cursor-pointer appearance-none truncate border-0 bg-transparent py-0.5 pr-2 text-xs font-medium text-inherit outline-none disabled:cursor-default"
                                disabled={!canEdit}
                                onChange={(event) => {
                                    onUpdate(item.id, { status: event.target.value })
                                }}
                                value={item.status}>
                                {statuses.map((status) => (
                                    <option
                                        key={status}
                                        value={status}>
                                        {status}
                                    </option>
                                ))}
                            </select>
                        </label>
                    ) : column === 'priority' ? (
                        <label className="worklist-priority-badge inline-flex items-center" data-priority={item.priority}><span aria-hidden="true">•</span>
                            <span className="sr-only">Priority for {item.title}</span>
                            <select
                                aria-label={`Priority for ${item.title}`}
                                className={`cursor-pointer appearance-none rounded-md border-0 bg-transparent py-1 pr-1 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[#8aa37c] disabled:cursor-default ${priorityTextStyle[item.priority]}`}
                                disabled={!canEdit}
                                onChange={(event) => {
                                    onUpdate(item.id, { priority: event.target.value as WorkItemPriority })
                                }}
                                value={item.priority}>
                                {(['Low', 'Medium', 'High'] as const).map((priority) => (
                                    <option
                                        key={priority}
                                        value={priority}>
                                        {priority}
                                    </option>
                                ))}
                            </select>
                        </label>
                    ) : column === 'assignee' ? (
                        <Popover open={isEditingAssignee} onOpenChange={(open) => { setIsEditingAssignee(open); if (open) setDraftAssignee(item.assigneeEmail ?? '') }}>
                            <PopoverTrigger asChild>
                                <button aria-label={`Assign ${item.title} by email`} className="worklist-assignee flex max-w-full items-center gap-2 rounded-md text-left" disabled={!canEdit} title={item.assigneeEmail || item.assignee} type="button">
                                    <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-[#dff2e8] text-[10px] font-semibold text-[#376b53]">{item.assignee === 'Unassigned' ? '+' : initialsOf(item.assigneePending ? item.assignee.split('@')[0] ?? item.assignee : item.assignee)}</span>
                                    <span className="min-w-0"><span className="block truncate text-[11px] text-[#34463b]">{item.assignee === 'Unassigned' ? 'Assign by email' : item.assignee}</span>{item.assigneePending && <span className="block text-[9px] text-[#8b948d]">Invitation pending</span>}</span>
                                </button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-80 rounded-xl p-4">
                                <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); onUpdate(item.id, { assignee: draftAssignee.trim().toLowerCase() || 'Unassigned' }); setIsEditingAssignee(false) }}>
                                    <label className="grid gap-2 text-xs font-medium">Assign by email<Input aria-label={`Assignee email for ${item.title}`} autoFocus autoComplete="email" maxLength={254} onChange={(event) => { setDraftAssignee(event.target.value) }} placeholder="teammate@example.com" type="email" value={draftAssignee} /></label>
                                    <p className="text-xs leading-5 text-slate-500">We’ll email this person. New people receive a workspace invitation from the owner. Leave blank to unassign.</p>
                                    <div className="flex justify-end gap-2"><Button onClick={() => { setIsEditingAssignee(false) }} type="button" variant="ghost">Cancel</Button><Button type="submit">{draftAssignee.trim() ? 'Assign & send' : 'Unassign'}</Button></div>
                                </form>
                            </PopoverContent>
                        </Popover>
                    ) : isEditingDueDate ? (
                        <form
                            className="flex min-w-36 items-center gap-1"
                            onSubmit={(event) => {
                                event.preventDefault()
                                if (draftDueDate) onUpdate(item.id, { dueDate: draftDueDate })
                                setIsEditingDueDate(false)
                            }}>
                            <Input
                                aria-label={`Edit due date for ${item.title}`}
                                autoFocus
                                className="h-8 min-w-28"
                                onChange={(event) => {
                                    setDraftDueDate(event.target.value)
                                }}
                                required
                                type="date"
                                value={draftDueDate}
                            />
                            <Button
                                aria-label="Save due date"
                                className="size-7"
                                size="icon"
                                type="submit"
                                variant="ghost">
                                <Check aria-hidden="true" />
                            </Button>
                            <Button
                                aria-label="Cancel due date edit"
                                className="size-7"
                                onClick={() => {
                                    setDraftDueDate(item.dueDate)
                                    setIsEditingDueDate(false)
                                }}
                                size="icon"
                                type="button"
                                variant="ghost">
                                <X aria-hidden="true" />
                            </Button>
                        </form>
                    ) : (
                        <span className="group/due-date flex items-center gap-1 text-[13px] text-[#4d5f54]">
                            <span className={isOverdue(item.dueDate, item.status) ? 'text-[#b4503d]' : ''}>{item.startDate ? `${formatDate(item.startDate)} - ` : ''}{formatDate(item.dueDate)}</span>
                            {canEdit && (
                                <Button
                                    aria-label={`Edit due date for ${item.title}`}
                                    className="size-6 opacity-0 group-hover/due-date:opacity-100 focus-visible:opacity-100"
                                    onClick={() => {
                                        setDraftDueDate(item.dueDate)
                                        setIsEditingDueDate(true)
                                    }}
                                    size="icon"
                                    type="button"
                                    variant="ghost">
                                    <Pencil
                                        aria-hidden="true"
                                        className="size-3"
                                    />
                                </Button>
                            )}
                        </span>
                    )}
                </TableCell>
                {column === 'dueDate' && <TableCell className="worklist-type-cell">{item.tags?.length ? <span className="worklist-type-badge" title={item.tags.join(', ')}>{item.tags[0]}</span> : '-'}</TableCell>}
            </Fragment>))}
        </>
    )
}
