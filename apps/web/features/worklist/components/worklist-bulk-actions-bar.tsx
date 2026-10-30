'use client'

import { useEffect, useState, type FormEvent, type ReactElement } from 'react'
import { ChevronDown } from 'lucide-react'
import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    Input,
} from '@workspace/ui/primitives'
import { maxBulkSelection } from '@workspace/worklist-ui'
import type { WorkItemPriority } from '../model'
import type { useWorklistPageState } from '../use-worklist-page-state'
import type { useWorklistBulkActions } from '../use-worklist-bulk-actions'
import { canEditWorkspace } from '../permissions'

export type WorklistBulkActionsBarProps = Readonly<{
    state: ReturnType<typeof useWorklistPageState>
    activeStatuses: readonly string[]
    visibleSelectedIds: ReadonlySet<string>
    actions: ReturnType<typeof useWorklistBulkActions>
}>

const actionButtonClass = 'h-8 gap-1 rounded-md border-0 bg-transparent px-2.5 text-xs font-normal text-white/90 shadow-none hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60'

export const WorklistBulkActionsBar = ({ state, activeStatuses, visibleSelectedIds, actions }: WorklistBulkActionsBarProps): ReactElement | null => {
    const { user, lists, activeListId, setSelectedIds } = state
    const [assigneeOpen, setAssigneeOpen] = useState(false)
    const [dueDateOpen, setDueDateOpen] = useState(false)
    const [assignee, setAssignee] = useState('')
    const [dueDate, setDueDate] = useState('')

    useEffect(() => {
        if (visibleSelectedIds.size === 0) return
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') setSelectedIds(new Set())
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [visibleSelectedIds.size, setSelectedIds])

    if (!user || !canEditWorkspace(user.role) || visibleSelectedIds.size === 0) return null

    const submitAssignee = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault()
        actions.updateSelectedAssigneeTo(assignee)
        setAssigneeOpen(false)
    }
    const submitDueDate = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault()
        if (!dueDate) return
        actions.updateSelectedDueDateTo(dueDate)
        setDueDateOpen(false)
    }

    return (
        <>
            <div aria-label="Bulk actions" className="mb-3 flex min-h-10 flex-wrap items-center gap-x-1 gap-y-1 rounded-lg bg-[#173f35] px-3 py-1.5 text-sm text-white sm:px-4">
                <span className="mr-4 shrink-0 text-xs font-semibold">
                    {visibleSelectedIds.size} selected{visibleSelectedIds.size === maxBulkSelection ? ` · max ${maxBulkSelection}` : ''}
                </span>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button className={actionButtonClass} size="sm" variant="outline">Set status <ChevronDown aria-hidden="true" className="size-3" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="rounded-lg border-[#dce4da]">
                        <DropdownMenuLabel>Set status</DropdownMenuLabel>
                        {activeStatuses.map((status) => <DropdownMenuItem key={status} onSelect={() => actions.updateSelectedStatusTo(status)}>{status}</DropdownMenuItem>)}
                    </DropdownMenuContent>
                </DropdownMenu>

                <Button className={actionButtonClass} onClick={() => setAssigneeOpen(true)} size="sm" variant="ghost">Assign <ChevronDown aria-hidden="true" className="size-3" /></Button>
                <Button className={actionButtonClass} onClick={() => setDueDateOpen(true)} size="sm" variant="ghost">Due date <ChevronDown aria-hidden="true" className="size-3" /></Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button className={actionButtonClass} size="sm" variant="ghost">Move to…</Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="max-h-72 w-56 overflow-y-auto rounded-lg border-[#dce4da]">
                        <DropdownMenuLabel>Move selected tasks to</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {lists.filter((list) => !list.archivedAt && list.id !== activeListId).map((list) => <DropdownMenuItem key={list.id} onSelect={() => actions.moveSelectedToListId(list.id)}>{list.name}</DropdownMenuItem>)}
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button className={actionButtonClass} size="sm" variant="ghost">Priority <ChevronDown aria-hidden="true" className="size-3" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-lg border-[#dce4da]">
                        <DropdownMenuLabel>More actions</DropdownMenuLabel>
                        {(['Low', 'Medium', 'High'] as const).map((priority: WorkItemPriority) => <DropdownMenuItem key={priority} onSelect={() => actions.updateSelectedPriorityTo(priority)}>Set priority · {priority}</DropdownMenuItem>)}
                    </DropdownMenuContent>
                </DropdownMenu>

                <Button aria-label="Delete selected tasks" className={actionButtonClass} onClick={actions.deleteSelected} size="sm" variant="ghost">Delete</Button>
                <span className="ml-2 hidden text-[11px] text-white/60 sm:inline">Esc to clear</span>
            </div>

            <Dialog onOpenChange={setAssigneeOpen} open={assigneeOpen}>
                <DialogContent className="rounded-xl border-[#dfe7df] sm:max-w-sm">
                    <DialogHeader><DialogTitle>Assign selected tasks</DialogTitle><DialogDescription>Enter an email address. New people receive a workspace invitation from the owner. Leave blank to unassign.</DialogDescription></DialogHeader>
                    <form className="grid gap-4" onSubmit={submitAssignee}>
                        <Input autoFocus aria-label="Assignee email" type="email" maxLength={254} onChange={(event) => setAssignee(event.target.value)} placeholder="teammate@example.com" value={assignee} />
                        <DialogFooter><Button className="bg-[#174638] text-white hover:bg-[#123b30]" type="submit">Apply assignment</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog onOpenChange={setDueDateOpen} open={dueDateOpen}>
                <DialogContent className="rounded-xl border-[#dfe7df] sm:max-w-sm">
                    <DialogHeader><DialogTitle>Set due date</DialogTitle><DialogDescription>Apply one due date to all {visibleSelectedIds.size} selected tasks.</DialogDescription></DialogHeader>
                    <form className="grid gap-4" onSubmit={submitDueDate}>
                        <Input autoFocus aria-label="Due date for selected tasks" onChange={(event) => setDueDate(event.target.value)} required type="date" value={dueDate} />
                        <DialogFooter><Button className="bg-[#174638] text-white hover:bg-[#123b30]" type="submit">Apply due date</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}
