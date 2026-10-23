'use client'

import { useState, type ReactElement } from 'react'
import { CalendarDays, GripVertical, Plus } from 'lucide-react'
import { Button } from '@workspace/ui/primitives'
import type { WorkItem, WorkItemPriority, WorkItemStatus, WorklistListOption } from '../model/index.js'
import { formatDate, priorityStyles, statusDotStyle, statusStyle } from './worklist-presentation.js'

type WorklistBoardProps = Readonly<{
    items: readonly WorkItem[]
    lists: readonly WorklistListOption[]
    statuses: readonly string[]
    canEdit: boolean
    onUpdate: (itemId: string, changes: Partial<WorkItem>) => void
    onAddTask: (status: WorkItemStatus) => void
}>

export const WorklistBoard = ({ items, lists, statuses, canEdit, onUpdate, onAddTask }: WorklistBoardProps): ReactElement => {
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null)
    const [dropStatus, setDropStatus] = useState<WorkItemStatus | null>(null)

    return (
        <section
            aria-label="Tasks board"
            className="mt-5 grid gap-4 overflow-x-auto pb-3 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
            {statuses.map((status) => {
                const statusItems = items.filter((item) => item.status === status)
                return (
                    <section
                        aria-label={`${status} tasks`}
                        className={`min-w-[280px] rounded-2xl border p-3 transition-colors ${dropStatus === status ? 'border-[#9fbd8b] bg-[#f0f6eb]' : 'border-[#e0e5dd] bg-[#f7f9f5]'}`}
                        key={status}
                        onDragOver={(event) => {
                            if (canEdit) {
                                event.preventDefault()
                                setDropStatus(status)
                            }
                        }}
                        onDragLeave={(event) => {
                            if (!event.currentTarget.contains(event.relatedTarget as Node | null))
                                setDropStatus((current) => (current === status ? null : current))
                        }}
                        onDrop={(event) => {
                            event.preventDefault()
                            const itemId = event.dataTransfer.getData('text/worklist-item') || draggedItemId
                            if (itemId && canEdit) onUpdate(itemId, { status: status })
                            setDraggedItemId(null)
                            setDropStatus(null)
                        }}>
                        <div className="flex items-center justify-between gap-3 px-1 pb-3">
                            <div className="flex min-w-0 items-center gap-2.5">
                                <span
                                    className={`size-2.5 rounded-full ${statusDotStyle(status)}`}
                                    aria-hidden="true"
                                />
                                <h2 className="truncate text-sm font-semibold text-[#344238]">{status}</h2>
                                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-[#718076]">{statusItems.length}</span>
                            </div>
                            {canEdit && (
                                <Button
                                    aria-label={`Add task to ${status}`}
                                    className="size-8 rounded-lg text-[#6c7a6e]"
                                    onClick={() => {
                                        onAddTask(status)
                                    }}
                                    size="icon"
                                    type="button"
                                    variant="ghost">
                                    <Plus
                                        aria-hidden="true"
                                        className="size-4"
                                    />
                                </Button>
                            )}
                        </div>
                        <div
                            className="min-h-32 space-y-2 rounded-xl"
                            aria-label={`Drop tasks into ${status}`}>
                            {statusItems.map((item) => (
                                <article
                                    className={`group rounded-xl border border-[#e3e8df] bg-white p-3.5 shadow-[0_4px_16px_-14px_rgba(23,33,28,0.35)] transition duration-150 hover:-translate-y-0.5 hover:border-[#cbd8c3] hover:shadow-md ${draggedItemId === item.id ? 'opacity-45' : ''}`}
                                    draggable={canEdit}
                                    key={item.id}
                                    onDragStart={(event) => {
                                        event.dataTransfer.effectAllowed = 'move'
                                        event.dataTransfer.setData('text/worklist-item', item.id)
                                        setDraggedItemId(item.id)
                                    }}
                                    onDragEnd={() => {
                                        setDraggedItemId(null)
                                        setDropStatus(null)
                                    }}>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex min-w-0 items-start gap-1">
                                            <GripVertical
                                                aria-hidden="true"
                                                className={`mt-0.5 size-4 shrink-0 text-[#aab3aa] ${canEdit ? 'cursor-grab' : 'invisible'}`}
                                            />
                                            <h3 className="line-clamp-2 text-sm font-medium leading-5 text-[#263329]">{item.title}</h3>
                                        </div>
                                        <label
                                            className="sr-only"
                                            htmlFor={`board-priority-${item.id}`}>
                                            Priority for {item.title}
                                        </label>
                                        <select
                                            aria-label={`Priority for ${item.title}`}
                                            className={`shrink-0 cursor-pointer rounded-full border-0 px-2 py-1 text-[10px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[#8aa37c] ${priorityStyles[item.priority]}`}
                                            disabled={!canEdit}
                                            id={`board-priority-${item.id}`}
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
                                    </div>
                                    {item.description && (
                                        <p className="mt-2 line-clamp-2 pl-5 text-xs leading-5 text-[#778278]">{item.description}</p>
                                    )}
                                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#f0f2ef] pt-3">
                                        <span className="flex min-w-0 items-center gap-2 text-xs text-[#68756a]">
                                            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#edf2e9] text-[9px] font-semibold text-[#526d46]">
                                                {item.assignee === 'Unassigned'
                                                    ? '—'
                                                    : item.assignee
                                                          .split(' ')
                                                          .map((part) => part[0])
                                                          .join('')
                                                          .slice(0, 2)
                                                          .toUpperCase()}
                                            </span>
                                            <span className="max-w-28 truncate">{item.assignee}</span>
                                        </span>
                                        <span className="flex items-center gap-1.5 text-xs text-[#778278]">
                                            <CalendarDays
                                                aria-hidden="true"
                                                className="size-3.5"
                                            />
                                            {formatDate(item.dueDate)}
                                        </span>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between gap-2">
                                        <label
                                            className="sr-only"
                                            htmlFor={`board-status-${item.id}`}>
                                            Status for {item.title}
                                        </label>
                                        <select
                                            aria-label={`Status for ${item.title}`}
                                            className={`h-7 cursor-pointer rounded-lg border-0 px-2 text-[11px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#8aa37c] ${statusStyle(item.status)}`}
                                            disabled={!canEdit}
                                            id={`board-status-${item.id}`}
                                            onChange={(event) => {
                                                onUpdate(item.id, { status: event.target.value })
                                            }}
                                            value={item.status}>
                                            {statuses.map((option) => (
                                                <option
                                                    key={option}
                                                    value={option}>
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                        {canEdit && (
                                            <span className="text-[10px] text-[#9aa39b] opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                                                Drag to move
                                            </span>
                                        )}
                                    </div>
                                    <label className="mt-2 block text-[11px] text-[#778278]">
                                        List
                                        <select
                                            aria-label={`Move ${item.title} to list`}
                                            className="ml-2 h-7 max-w-[70%] rounded-md border border-[#e3e8df] bg-white px-2 text-xs text-[#344238]"
                                            disabled={!canEdit}
                                            onChange={(event) => {
                                                onUpdate(item.id, { listId: event.target.value })
                                            }}
                                            value={item.listId ?? ''}>
                                            {lists
                                                .filter((list) => !list.archivedAt)
                                                .map((list) => (
                                                    <option
                                                        key={list.id}
                                                        value={list.id}>
                                                        {list.name}
                                                    </option>
                                                ))}
                                        </select>
                                    </label>
                                </article>
                            ))}
                            {statusItems.length === 0 && (
                                <div className="grid min-h-24 place-items-center rounded-xl border border-dashed border-[#dbe2d7] bg-white/60 px-3 text-center text-xs text-[#98a198]">
                                    Drop a task here
                                </div>
                            )}
                        </div>
                    </section>
                )
            })}
        </section>
    )
}
