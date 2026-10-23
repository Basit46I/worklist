'use client'

import type { ReactElement } from 'react'
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input } from '@workspace/ui/primitives'
import type { WorklistList } from '../api'
import type { useWorklistPageState } from '../use-worklist-page-state'
import type { useWorklistListActions } from '../use-worklist-list-actions'
import { canEditWorkspace } from '../permissions'

type WorklistListFormProps = Readonly<{
    state: ReturnType<typeof useWorklistPageState>
    listActions: ReturnType<typeof useWorklistListActions>
    user: NonNullable<ReturnType<typeof useWorklistPageState>['user']>
    activeList: WorklistList | undefined
}>

export const WorklistCreateListForm = ({ state, listActions }: WorklistListFormProps): ReactElement => {
    const { showListForm, setShowListForm, listNameDraft, setListNameDraft, newListSpace, setNewListSpace, newListFolder, setNewListFolder, newListDescription, setNewListDescription } = state

    return <Dialog onOpenChange={setShowListForm} open={showListForm}>
        <DialogContent className="max-w-xl rounded-2xl border-[#dce4da] p-6 sm:p-7">
            <DialogHeader className="text-left"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#668356]">Workspace structure</p><DialogTitle className="font-serif text-2xl font-normal text-[#203d33]">Create a list</DialogTitle><DialogDescription>Give related tasks a shared home. Add a space and an optional folder to keep work organized.</DialogDescription></DialogHeader>
            <form className="mt-2 grid gap-4 sm:grid-cols-2" onSubmit={(event) => void listActions.saveListName(event)}>
                <label className="grid gap-1.5 text-xs font-medium text-[#59665c] sm:col-span-2">List name<Input aria-label="New list name" autoFocus className="h-10 rounded-lg" maxLength={80} onChange={(event) => setListNameDraft(event.target.value)} placeholder="e.g. Website launch" required value={listNameDraft} /></label>
                <label className="grid gap-1.5 text-xs font-medium text-[#59665c]">Space<Input aria-label="New list space" className="h-10 rounded-lg" maxLength={80} onChange={(event) => setNewListSpace(event.target.value)} placeholder="General" required value={newListSpace} /></label>
                <label className="grid gap-1.5 text-xs font-medium text-[#59665c]">Folder <span className="font-normal text-[#879188]">· optional</span><Input aria-label="New list folder" className="h-10 rounded-lg" maxLength={80} onChange={(event) => setNewListFolder(event.target.value)} placeholder="e.g. Q4 launches" value={newListFolder} /></label>
                <label className="grid gap-1.5 text-xs font-medium text-[#59665c] sm:col-span-2">Description <span className="font-normal text-[#879188]">· optional</span><Input aria-label="New list description" className="h-10 rounded-lg" maxLength={500} onChange={(event) => setNewListDescription(event.target.value)} placeholder="What work belongs in this list?" value={newListDescription} /></label>
                <DialogFooter className="sm:col-span-2"><Button className="bg-[#173f35] text-white hover:bg-[#245246]" type="submit">Create list</Button><Button onClick={() => setShowListForm(false)} type="button" variant="outline">Cancel</Button></DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
}

export const WorklistListMetadataForms = ({ state, listActions, user }: WorklistListFormProps): ReactElement => {
    const { showDescriptionForm, setShowDescriptionForm, descriptionDraft, setDescriptionDraft, showStatusForm, setShowStatusForm, statusDraft, setStatusDraft } = state
    const editable = canEditWorkspace(user.role)

    return <>
        {editable && <Dialog onOpenChange={setShowDescriptionForm} open={showDescriptionForm}>
            <DialogContent className="max-w-lg rounded-2xl border-[#dce4da] p-6 sm:p-7">
                <DialogHeader className="text-left"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#668356]">List details</p><DialogTitle className="font-serif text-2xl font-normal text-[#203d33]">Edit description</DialogTitle><DialogDescription>Help the team understand what work belongs in this list.</DialogDescription></DialogHeader>
                <form className="mt-2" onSubmit={listActions.saveListDescription}>
                    <label className="grid gap-1.5 text-xs font-medium text-[#59665c]">List description<textarea aria-label="List description" autoFocus className="min-h-28 w-full rounded-lg border border-[#dfe5dc] bg-[#fbfcfa] px-3 py-2 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-[#668356]" maxLength={500} onChange={(event) => setDescriptionDraft(event.target.value)} placeholder="Describe what this list is for…" value={descriptionDraft} /></label>
                    <DialogFooter className="mt-4"><Button className="bg-[#173f35] text-white hover:bg-[#245246]" type="submit">Save description</Button><Button onClick={() => setShowDescriptionForm(false)} type="button" variant="outline">Cancel</Button></DialogFooter>
                </form>
            </DialogContent>
        </Dialog>}
        {editable && <Dialog onOpenChange={setShowStatusForm} open={showStatusForm}>
            <DialogContent className="max-w-lg rounded-2xl border-[#dce4da] p-6 sm:p-7">
                <DialogHeader className="text-left"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#668356]">List settings</p><DialogTitle className="font-serif text-2xl font-normal text-[#203d33]">Set the workflow</DialogTitle><DialogDescription>These statuses are shared by tasks in List, Board, and Calendar views.</DialogDescription></DialogHeader>
                <form aria-label="Edit list status workflow" className="mt-2" onSubmit={listActions.saveListStatuses}>
                    <label className="grid gap-1.5 text-xs font-medium text-[#59665c]">Workflow statuses<textarea aria-label="List statuses" autoFocus className="min-h-36 w-full rounded-lg border border-[#dfe5dc] bg-[#fbfcfa] px-3 py-2 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-[#668356]" maxLength={500} onChange={(event) => setStatusDraft(event.target.value)} placeholder="One status per line" value={statusDraft} /></label>
                    <p className="mt-2 text-xs leading-5 text-[#718076]">Use 2–12 unique names. A status in use must be reassigned before it can be removed.</p>
                    <DialogFooter className="mt-4"><Button className="bg-[#173f35] text-white hover:bg-[#245246]" type="submit">Save workflow</Button><Button onClick={() => setShowStatusForm(false)} type="button" variant="outline">Cancel</Button></DialogFooter>
                </form>
            </DialogContent>
        </Dialog>}
    </>
}
