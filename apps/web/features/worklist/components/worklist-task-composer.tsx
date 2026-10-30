'use client'

import { useState, type ReactElement } from 'react'
import { Plus } from 'lucide-react'
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input } from '@workspace/ui/primitives'
import type { useWorklistPageState } from '../use-worklist-page-state'
import type { useWorklistItemActions } from '../use-worklist-item-actions'
import type { WorkItemPriority } from '../model'
import { canEditWorkspace } from '../permissions'

type WorklistTaskComposerProps = Readonly<{
    state: ReturnType<typeof useWorklistPageState>
    createItem: ReturnType<typeof useWorklistItemActions>['createItem']
    activeStatuses: readonly string[]
    user: NonNullable<ReturnType<typeof useWorklistPageState>['user']>
}>

export const WorklistTaskComposer = ({ state, createItem, activeStatuses, user }: WorklistTaskComposerProps): ReactElement => {
    const [submitting, setSubmitting] = useState(false)
    const [requestContact, setRequestContact] = useState('')
    const [requestEmail, setRequestEmail] = useState('')
    const [requestDetails, setRequestDetails] = useState('')
    const hasClientRequest = Boolean(requestContact.trim() || requestEmail.trim() || requestDetails.trim())
    const { showNewItem, setShowNewItem, newStatus, setNewStatus, newTitle, setNewTitle, newPriority, setNewPriority, newAssignee, setNewAssignee, newDueDate, setNewDueDate, newDescription, setNewDescription } = state
    return (
        <Dialog onOpenChange={setShowNewItem} open={canEditWorkspace(user.role) && showNewItem}>
            <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-2xl border-[#dce4da] p-5 sm:p-7">
                <DialogHeader className="pr-8 text-left"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#668356]">Worklist · new task</p><DialogTitle className="font-serif text-2xl font-normal text-[#203d33]">Make room for the next step</DialogTitle><DialogDescription>Create a task in {state.activeListId ? 'the selected list' : 'your workspace'} and add only the details your team needs.</DialogDescription></DialogHeader>
            {canEditWorkspace(user.role) && showNewItem && (
                    <form
                        className="grid gap-4"
                        onSubmit={(event) => {
                            if (submitting) { event.preventDefault(); return }
                            setSubmitting(true)
                            void createItem(event, hasClientRequest ? { contactName: requestContact.trim(), contactEmail: requestEmail.trim(), request: requestDetails.trim() } : null).finally(() => { setSubmitting(false) })
                            if (hasClientRequest) {
                                setRequestContact('')
                                setRequestEmail('')
                                setRequestDetails('')
                            }
                        }}>
                        <details className="mt-4 rounded-xl border border-[#e8ede5] bg-[#fbfcfa] p-3">
                            <summary className="cursor-pointer text-sm font-medium text-[#526d46]">Client request details <span className="font-normal text-[#879188]">· optional intake form</span></summary>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <label className="text-xs font-medium text-[#59665c]">Client name<Input aria-label="Client contact name" className="mt-1 h-10 bg-white" maxLength={120} onChange={(event) => setRequestContact(event.target.value)} required={hasClientRequest} value={requestContact} /></label>
                                <label className="text-xs font-medium text-[#59665c]">Client email<Input aria-label="Client contact email" className="mt-1 h-10 bg-white" maxLength={254} onChange={(event) => setRequestEmail(event.target.value)} required={hasClientRequest} type="email" value={requestEmail} /></label>
                                <label className="text-xs font-medium text-[#59665c] sm:col-span-2">Request<textarea aria-label="Client request details" className="mt-1 min-h-16 w-full rounded-xl border border-[#dfe5dc] bg-white px-3 py-2 text-sm font-normal" maxLength={2000} onChange={(event) => setRequestDetails(event.target.value)} required={hasClientRequest} value={requestDetails} /></label>
                                <p className="text-xs text-[#879188] sm:col-span-2">Creates a task for the signed-in team. It does not publish an anonymous client form.</p>
                            </div>
                        </details>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <label className="space-y-1.5 text-xs font-medium text-[#59665c] sm:col-span-2">
                                Task name
                                <Input
                                    aria-label="Task title"
                                    autoFocus
                                    className="h-11 rounded-xl border-[#dfe5dc] bg-[#fbfcfa] text-sm"
                                    maxLength={200}
                                    onChange={(event) => setNewTitle(event.target.value)}
                                    placeholder="What needs to be done?"
                                    required
                                    value={newTitle}
                                />
                            </label>
                            <label className="space-y-1.5 text-xs font-medium text-[#59665c]">
                                Status
                                <select
                                    aria-label="New task status"
                                    className="h-11 w-full rounded-xl border border-[#dfe5dc] bg-[#fbfcfa] px-3 text-sm"
                                    onChange={(event) => setNewStatus(event.target.value)}
                                    value={activeStatuses.includes(newStatus) ? newStatus : activeStatuses[0]}>
                                    {activeStatuses.map((status) => (
                                        <option
                                            key={status}
                                            value={status}>
                                            {status}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="space-y-1.5 text-xs font-medium text-[#59665c]">
                                Priority
                                <select
                                    aria-label="New task priority"
                                    className="h-11 w-full rounded-xl border border-[#dfe5dc] bg-[#fbfcfa] px-3 text-sm"
                                    onChange={(event) => setNewPriority(event.target.value as WorkItemPriority)}
                                    value={newPriority}>
                                    {(['Low', 'Medium', 'High'] as const).map((priority) => (
                                        <option
                                            key={priority}
                                            value={priority}>
                                            {priority}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="space-y-1.5 text-xs font-medium text-[#59665c]">
                                Assign by email
                                <Input
                                    aria-label="Assignee email"
                                    type="email"
                                    autoComplete="email"
                                    className="h-11 rounded-xl border-[#dfe5dc] bg-[#fbfcfa] text-sm"
                                    maxLength={254}
                                    onChange={(event) => setNewAssignee(event.target.value)}
                                    placeholder="teammate@example.com"
                                    value={newAssignee}
                                /><span className="block text-[11px] font-normal text-[#879188]">Optional. We’ll email the assignee. New people receive a workspace invitation from the owner.</span>
                            </label>
                            <label className="space-y-1.5 text-xs font-medium text-[#59665c]">
                                Due date
                                <Input
                                    aria-label="New task due date"
                                    className="h-11 rounded-xl border-[#dfe5dc] bg-[#fbfcfa] text-sm"
                                    onChange={(event) => setNewDueDate(event.target.value)}
                                    required
                                    type="date"
                                    value={newDueDate}
                                />
                            </label>
                            <label className="space-y-1.5 text-xs font-medium text-[#59665c] sm:col-span-2 lg:col-span-4">
                                Description <span className="font-normal text-[#929b93]">· optional</span>
                                <textarea
                                    aria-label="Task description"
                                    className="min-h-20 w-full rounded-xl border border-[#dfe5dc] bg-[#fbfcfa] px-3 py-2.5 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-[#8aa37c]"
                                    maxLength={2000}
                                    onChange={(event) => setNewDescription(event.target.value)}
                                    placeholder="Add helpful context, acceptance details, or links…"
                                    rows={3}
                                    value={newDescription}
                                />
                            </label>
                        </div>
                        <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-[#edf0eb] pt-4">
                            <Button
                                className="h-10 rounded-xl px-4"
                                onClick={() => setShowNewItem(false)}
                                type="button"
                                variant="ghost">
                                Cancel
                            </Button>
                            <Button
                                className="h-10 rounded-xl bg-[#243b2c] px-4 text-white hover:bg-[#314b37]"
                                disabled={submitting}
                                type="submit">
                                <Plus
                                    aria-hidden="true"
                                    className="mr-1 size-4"
                                />{' '}
                                {submitting ? 'Saving…' : newAssignee.trim() ? 'Create & send' : 'Create task'}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
