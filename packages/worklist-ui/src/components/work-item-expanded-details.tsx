'use client'

import { useEffect, useState, type ReactElement } from 'react'
import { Button, Input } from '@workspace/ui/primitives'
import type { WorkItem, WorkItemActivityClient, WorkItemApprovalClient, WorklistCommentClient, WorklistListOption } from '../model/index.js'
import { formatDate } from './worklist-presentation.js'
import { WorkItemComments } from './work-item-comments.js'
import { WorkItemActivityFeed } from './work-item-activity.js'

type WorkItemExpandedDetailsProps = Readonly<{
    item: WorkItem
    availableItems: readonly WorkItem[]
    lists: readonly WorklistListOption[]
    canEdit: boolean
    expanded: boolean
    commentRefreshSequence: number
    commentRefreshItemId: string | null
    commentClient: WorklistCommentClient
    activityClient: WorkItemActivityClient
    approvalClient: WorkItemApprovalClient
    onUpdate: (itemId: string, changes: Partial<WorkItem>) => void
    onCreateSubtask: (parentId: string, title: string) => void
}>

export const WorkItemExpandedDetails = ({ item, availableItems, lists, canEdit, expanded, commentRefreshSequence, commentRefreshItemId, commentClient, activityClient, approvalClient, onUpdate, onCreateSubtask }: WorkItemExpandedDetailsProps): ReactElement | null => {
    const [isEditingDescription, setIsEditingDescription] = useState(false)
    const [draftDescription, setDraftDescription] = useState(item.description)
    const [subtaskTitle, setSubtaskTitle] = useState('')
    const [checklistDraft, setChecklistDraft] = useState('')
    const [tagDraft, setTagDraft] = useState('')
    const [approvalFeedback, setApprovalFeedback] = useState(item.approvalFeedback ?? '')
    const [timeEntryDraft, setTimeEntryDraft] = useState('')
    const [approvalBusy, setApprovalBusy] = useState(false)
    const [approvalMessage, setApprovalMessage] = useState('')
    useEffect(() => { setApprovalFeedback(item.approvalFeedback ?? '') }, [item.id, item.approvalFeedback])
    const saveDescription = (): void => {
        const description = draftDescription.trim()
        onUpdate(item.id, { description })
        setDraftDescription(description)
        setIsEditingDescription(false)
    }
    const sendApprovalRequest = (): void => {
        const email = item.clientRequest?.contactEmail
        if (!email) return
        setApprovalBusy(true)
        setApprovalMessage('')
        void approvalClient.request(item.id)
            .then(() => { setApprovalMessage(`Review link sent to ${email}.`) })
            .catch((error: unknown) => { setApprovalMessage(error instanceof Error ? error.message : 'Could not send the approval link.') })
            .finally(() => { setApprovalBusy(false) })
    }
    const dependencyCandidates = availableItems.filter((candidate) => candidate.id !== item.id && candidate.listId === item.listId && !candidate.parentId)
    return (
        <>
            {expanded && (
                    <div className="mt-3 grid gap-4 border-t border-slate-100 pt-3 text-sm sm:grid-cols-3">
                        <div className="sm:col-span-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Description</p>
                            {isEditingDescription ? (
                                <form
                                    className="mt-1 flex flex-wrap items-start gap-2"
                                    onSubmit={(event) => {
                                        event.preventDefault()
                                        saveDescription()
                                    }}>
                                    <textarea
                                        aria-label={`Description for ${item.title}`}
                                        autoFocus
                                        className="min-h-20 min-w-64 flex-1 rounded-md border border-slate-200 bg-white p-2 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        maxLength={2000}
                                        onChange={(event) => {
                                            setDraftDescription(event.target.value)
                                        }}
                                        value={draftDescription}
                                    />
                                    <Button
                                        aria-label="Save task description"
                                        className="h-8"
                                        type="submit"
                                        variant="outline">
                                        Save
                                    </Button>
                                    <Button
                                        aria-label="Cancel description edit"
                                        className="h-8"
                                        onClick={() => {
                                            setDraftDescription(item.description)
                                            setIsEditingDescription(false)
                                        }}
                                        type="button"
                                        variant="ghost">
                                        Cancel
                                    </Button>
                                </form>
                            ) : (
                                <div className="mt-1 flex items-start gap-2">
                                    <p className="whitespace-pre-wrap font-normal text-slate-700">{item.description || 'No description yet.'}</p>
                                    {canEdit && (
                                        <Button
                                            aria-label={`Edit description for ${item.title}`}
                                            className="h-7 shrink-0 px-2"
                                            onClick={() => {
                                                setDraftDescription(item.description)
                                                setIsEditingDescription(true)
                                            }}
                                            type="button"
                                            variant="ghost">
                                            Edit
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Status and priority</p>
                            <p className="mt-1 text-slate-700">
                                {item.status} · {item.priority}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Assignee and due date</p>
                            <p className="mt-1 text-slate-700">
                                {item.assignee} · {formatDate(item.dueDate)}
                            </p>
                        </div>
                        <label className="text-xs text-slate-500">
                            List
                            <select
                                aria-label={`Move ${item.title} to list`}
                                className="ml-2 h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700"
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
                                {canEdit && item.clientRequest?.contactEmail && <Button className="h-9" disabled={approvalBusy} onClick={sendApprovalRequest} type="button" variant="outline">{approvalBusy ? 'Sending…' : 'Send approval link'}</Button>}
                                {!item.clientRequest?.contactEmail && <p className="text-xs text-amber-700">Add a client request with an email address before requesting approval.</p>}
                                {approvalMessage && <p aria-live="polite" className="text-xs text-slate-600">{approvalMessage}</p>}
                            </div>
                            <form className="mt-3 flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); onUpdate(item.id, { approvalFeedback: approvalFeedback.trim() }) }}>
                                <Input aria-label={`Client feedback for ${item.title}`} className="min-w-56 flex-1" disabled={!canEdit} maxLength={2000} onChange={(event) => { setApprovalFeedback(event.target.value) }} placeholder="Client feedback or requested changes" value={approvalFeedback} />
                                {canEdit && <Button className="h-9" type="submit" variant="outline">Save feedback</Button>}
                            </form>
                        </section>
                        <section aria-label="Time tracking" className="rounded-lg border border-slate-200 bg-white p-3 sm:col-span-3">
                            <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Time tracked</h3><p className="mt-1 text-xs text-slate-500">Total recorded: {item.timeSpentMinutes ?? 0} minutes</p></div>
                                {canEdit && <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); const minutes = Number(timeEntryDraft); if (!Number.isSafeInteger(minutes) || minutes < 1) return; onUpdate(item.id, { timeSpentMinutes: (item.timeSpentMinutes ?? 0) + minutes }); setTimeEntryDraft('') }}>
                                    <Input aria-label={`Minutes to log for ${item.title}`} className="h-9 w-28" min={1} max={10000} onChange={(event) => { setTimeEntryDraft(event.target.value) }} placeholder="Minutes" type="number" value={timeEntryDraft} />
                                    <Button className="h-9" disabled={!timeEntryDraft} type="submit" variant="outline">Log time</Button>
                                </form>}
                            </div>
                        </section>
                        {canEdit && !item.parentId && (
                            <form
                                className="flex items-center gap-2"
                                onSubmit={(event) => {
                                    event.preventDefault()
                                    if (subtaskTitle.trim()) onCreateSubtask(item.id, subtaskTitle.trim())
                                    setSubtaskTitle('')
                                }}>
                                <Input
                                    aria-label={`New subtask for ${item.title}`}
                                    className="h-8 max-w-xs"
                                    maxLength={200}
                                    onChange={(event) => {
                                        setSubtaskTitle(event.target.value)
                                    }}
                                    placeholder="Add a subtask"
                                    value={subtaskTitle}
                                />
                                <Button
                                    className="h-8"
                                    disabled={!subtaskTitle.trim()}
                                    type="submit"
                                    variant="outline">
                                    Add subtask
                                </Button>
                            </form>
                        )}
                        <section aria-label="Task checklist" className="border-t border-slate-100 pt-3 sm:col-span-3">
                            <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">Checklist</h3>
                            <ul className="mt-2 space-y-1">
                                {(item.checklist ?? []).map((entry) => <li className="flex items-center gap-2 text-sm" key={entry.id}>
                                    <input aria-label={`${entry.completed ? 'Mark incomplete' : 'Complete'} ${entry.text}`} checked={entry.completed} disabled={!canEdit} onChange={() => { onUpdate(item.id, { checklist: (item.checklist ?? []).map((candidate) => candidate.id === entry.id ? { ...candidate, completed: !candidate.completed } : candidate) }) }} type="checkbox" />
                                    <span className={entry.completed ? 'text-slate-400 line-through' : 'text-slate-700'}>{entry.text}</span>
                                    {canEdit && <button aria-label={`Remove ${entry.text}`} className="ml-auto text-xs text-slate-400 hover:text-rose-600" onClick={() => { onUpdate(item.id, { checklist: (item.checklist ?? []).filter((candidate) => candidate.id !== entry.id) }) }} type="button">Remove</button>}
                                </li>)}
                            </ul>
                            {canEdit && <form className="mt-2 flex max-w-lg gap-2" onSubmit={(event) => { event.preventDefault(); const text = checklistDraft.trim(); if (!text) return; onUpdate(item.id, { checklist: [...(item.checklist ?? []), { id: crypto.randomUUID(), text, completed: false }] }); setChecklistDraft('') }}>
                                <Input aria-label="New checklist item" className="h-8" maxLength={240} onChange={(event) => { setChecklistDraft(event.target.value) }} placeholder="Add a checklist step" value={checklistDraft} />
                                <Button className="h-8" disabled={!checklistDraft.trim()} type="submit" variant="outline">Add step</Button>
                            </form>}
                            {!item.checklist?.length && <p className="mt-1 text-sm text-slate-500">No checklist steps yet.</p>}
                        </section>
                        <section aria-label="Task labels" className="border-t border-slate-100 pt-3 sm:col-span-3">
                            <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">Labels</h3>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {(item.tags ?? []).map((tag) => <span className="inline-flex items-center gap-1 rounded-full bg-[#eef4e9] px-2.5 py-1 text-xs text-[#405d39]" key={tag}>
                                    {tag}
                                    {canEdit && <button aria-label={`Remove label ${tag}`} className="font-semibold text-[#71856a] hover:text-rose-600" onClick={() => { onUpdate(item.id, { tags: (item.tags ?? []).filter((entry) => entry !== tag) }) }} type="button">×</button>}
                                </span>)}
                                {!(item.tags?.length) && <span className="text-sm text-slate-500">No labels yet.</span>}
                            </div>
                            {canEdit && <form className="mt-2 flex max-w-lg gap-2" onSubmit={(event) => {
                                event.preventDefault()
                                const tag = tagDraft.trim().replace(/^#/, '')
                                if (!tag || (item.tags ?? []).some((entry) => entry.toLocaleLowerCase() === tag.toLocaleLowerCase())) return
                                if ((item.tags ?? []).length >= 20) return
                                onUpdate(item.id, { tags: [...(item.tags ?? []), tag] })
                                setTagDraft('')
                            }}>
                                <Input aria-label="New task label" className="h-8" maxLength={32} onChange={(event) => { setTagDraft(event.target.value) }} placeholder="Add a label" value={tagDraft} />
                                <Button className="h-8" disabled={!tagDraft.trim() || (item.tags?.length ?? 0) >= 20} type="submit" variant="outline">Add label</Button>
                            </form>}
                        </section>
                        <fieldset className="text-xs text-slate-500 sm:col-span-2">
                            <legend>Blocked by</legend>
                            <div aria-label={`Dependencies for ${item.title}`} className="mt-1 max-h-32 overflow-y-auto rounded-md border border-slate-200 bg-white p-2">
                                {dependencyCandidates.length ? dependencyCandidates.map((candidate) => <label className="flex items-center gap-2 py-1 text-sm text-slate-700" key={candidate.id}>
                                    <input checked={(item.dependsOn ?? []).includes(candidate.id)} disabled={!canEdit} onChange={(event) => {
                                        const selected = new Set(item.dependsOn ?? [])
                                        if (event.target.checked) selected.add(candidate.id)
                                        else selected.delete(candidate.id)
                                        onUpdate(item.id, { dependsOn: [...selected] })
                                    }} type="checkbox" />
                                    <span className="min-w-0 flex-1 truncate">{candidate.title}</span><span className="text-xs text-slate-400">{candidate.status}</span>
                                </label>) : <p>No other tasks in this list.</p>}
                            </div>
                        </fieldset>
                        <label className="text-xs text-slate-500">Repeat task
                            <select aria-label={`Repeat ${item.title}`} className="mt-1 block h-8 rounded-md border border-slate-200 bg-white px-2 text-sm" disabled={!canEdit} onChange={(event) => { onUpdate(item.id, { recurrence: event.target.value ? { frequency: event.target.value as 'daily' | 'weekly' | 'monthly', interval: 1 } : null }) }} value={item.recurrence?.frequency ?? ''}>
                                <option value="">Does not repeat</option><option value="daily">Every day</option><option value="weekly">Every week</option><option value="monthly">Every month</option>
                            </select>
                        </label>
                        <WorkItemComments
                            canComment={canEdit}
                            commentClient={commentClient}
                            itemId={item.id}
                            refreshItemId={commentRefreshItemId}
                            refreshSequence={commentRefreshSequence}
                        />
                        <WorkItemActivityFeed client={activityClient} itemId={item.id} refreshItemId={commentRefreshItemId} refreshSequence={commentRefreshSequence} />
                    </div>
                )}
        </>
    )
}
