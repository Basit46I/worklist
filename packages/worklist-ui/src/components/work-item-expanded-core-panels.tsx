'use client'

import type { ReactElement } from 'react'
import { Button, Input } from '@workspace/ui/primitives'
import type { WorkItem, WorklistListOption } from '../model/index.js'
import { formatDate } from './worklist-presentation.js'

type CoreProps = Readonly<{
    item: WorkItem
    lists: readonly WorklistListOption[]
    canEdit: boolean
    draftDescription: string | null
    onDraftDescriptionChange: (value: string) => void
    onSaveDescription: () => void
    onEditDescription: () => void
    onCancelDescription: () => void
    approvalFeedback: string
    onApprovalFeedbackChange: (value: string) => void
    approvalBusy: boolean
    approvalMessage: string
    onSendApproval: () => void
    timeEntryDraft: string
    onTimeEntryChange: (value: string) => void
    onLogTime: () => void
    subtaskTitle: string
    onSubtaskTitleChange: (value: string) => void
    onCreateSubtask: () => void
    onUpdate: (itemId: string, changes: Partial<WorkItem>) => void
}>

export const WorkItemExpandedCorePanels = ({ item, lists, canEdit, draftDescription, onDraftDescriptionChange, onSaveDescription, onEditDescription, onCancelDescription, approvalFeedback, onApprovalFeedbackChange, approvalBusy, approvalMessage, onSendApproval, timeEntryDraft, onTimeEntryChange, onLogTime, subtaskTitle, onSubtaskTitleChange, onCreateSubtask, onUpdate }: CoreProps): ReactElement => (
    <>
        <div className="sm:col-span-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Description</p>
            {draftDescription !== null ? <form className="mt-1 flex flex-wrap items-start gap-2" onSubmit={(event) => { event.preventDefault(); onSaveDescription() }}>
                <textarea aria-label={`Description for ${item.title}`} autoFocus className="min-h-20 min-w-64 flex-1 rounded-md border border-slate-200 bg-white p-2 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring" maxLength={2000} onChange={(event) => { onDraftDescriptionChange(event.target.value) }} value={draftDescription} />
                <Button aria-label="Save task description" className="h-8" type="submit" variant="outline">Save</Button>
                <Button aria-label="Cancel description edit" className="h-8" onClick={onCancelDescription} type="button" variant="ghost">Cancel</Button>
            </form> : <div className="mt-1 flex items-start gap-2">
                <p className="whitespace-pre-wrap font-normal text-slate-700">{item.description || 'No description yet.'}</p>
                {canEdit && <Button aria-label={`Edit description for ${item.title}`} className="h-7 shrink-0 px-2" onClick={onEditDescription} type="button" variant="ghost">Edit</Button>}
            </div>}
        </div>
        <div><p className="text-xs font-medium uppercase tracking-wide text-slate-400">Status and priority</p><p className="mt-1 text-slate-700">{item.status} · {item.priority}</p></div>
        <div><p className="text-xs font-medium uppercase tracking-wide text-slate-400">Assignee and due date</p><p className="mt-1 text-slate-700">{item.assignee} · {formatDate(item.dueDate)}</p></div>
        <label className="text-xs text-slate-500">List
            <select aria-label={`Move ${item.title} to list`} className="ml-2 h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700" disabled={!canEdit} onChange={(event) => { onUpdate(item.id, { listId: event.target.value }) }} value={item.listId ?? ''}>
                {lists.filter((list) => !list.archivedAt).map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
            </select>
        </label>
        {item.clientRequest && <section aria-label="Client request" className="rounded-lg border border-slate-200 bg-white p-3 sm:col-span-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Client request</h3>
            <p className="mt-1 text-sm text-slate-700">{item.clientRequest.contactName} · {item.clientRequest.contactEmail}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{item.clientRequest.request}</p>
        </section>}
        <section aria-label="Client approval and feedback" className="rounded-lg border border-slate-200 bg-white p-3 sm:col-span-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div><h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Client approval</h3><p className="mt-1 text-xs text-slate-500">Send a secure review link to the client.</p></div>
                <select aria-label={`Approval status for ${item.title}`} className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm" disabled={!canEdit} onChange={(event) => { onUpdate(item.id, { approvalStatus: event.target.value as NonNullable<WorkItem['approvalStatus']> }) }} value={item.approvalStatus ?? 'not_requested'}>
                    <option value="not_requested">Not requested</option><option value="pending">Awaiting approval</option><option value="approved">Approved</option><option value="changes_requested">Changes requested</option>
                </select>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
                {canEdit && item.clientRequest?.contactEmail && <Button className="h-9" disabled={approvalBusy} onClick={onSendApproval} type="button" variant="outline">{approvalBusy ? 'Sending…' : 'Send approval link'}</Button>}
                {!item.clientRequest?.contactEmail && <p className="text-xs text-amber-700">Add a client request with an email address before requesting approval.</p>}
                {approvalMessage && <p aria-live="polite" className="text-xs text-slate-600">{approvalMessage}</p>}
            </div>
            <form className="mt-3 flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); onUpdate(item.id, { approvalFeedback: approvalFeedback.trim() }) }}>
                <Input aria-label={`Client feedback for ${item.title}`} className="min-w-56 flex-1" disabled={!canEdit} maxLength={2000} onChange={(event) => { onApprovalFeedbackChange(event.target.value) }} placeholder="Client feedback or requested changes" value={approvalFeedback} />
                {canEdit && <Button className="h-9" type="submit" variant="outline">Save feedback</Button>}
            </form>
        </section>
        <section aria-label="Time tracking" className="rounded-lg border border-slate-200 bg-white p-3 sm:col-span-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Time tracked</h3><p className="mt-1 text-xs text-slate-500">Total recorded: {item.timeSpentMinutes ?? 0} minutes</p></div>
                {canEdit && <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); onLogTime() }}>
                    <Input aria-label={`Minutes to log for ${item.title}`} className="h-9 w-28" min={1} max={10000} onChange={(event) => { onTimeEntryChange(event.target.value) }} placeholder="Minutes" type="number" value={timeEntryDraft} />
                    <Button className="h-9" disabled={!timeEntryDraft} type="submit" variant="outline">Log time</Button>
                </form>}
            </div>
        </section>
        {canEdit && !item.parentId && <form className="flex items-center gap-2" onSubmit={(event) => { event.preventDefault(); onCreateSubtask() }}>
            <Input aria-label={`New subtask for ${item.title}`} className="h-8 max-w-xs" maxLength={200} onChange={(event) => { onSubtaskTitleChange(event.target.value) }} placeholder="Add a subtask" value={subtaskTitle} />
            <Button className="h-8" disabled={!subtaskTitle.trim()} type="submit" variant="outline">Add subtask</Button>
        </form>}
    </>
)
