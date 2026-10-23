'use client'

import { useState, type FormEvent, type ReactElement } from 'react'
import { Archive, ChevronDown, Copy, FileText, Folder, Pencil, Settings2, Trash2, Workflow } from 'lucide-react'
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Input } from '@workspace/ui/primitives'
import { fetchWorklistLists, updateWorklistList, type WorklistList } from '../api'
import { useWorklistPageState } from '../use-worklist-page-state'
import { useWorklistListActions } from '../use-worklist-list-actions'
import { useWorklistTemplateActions } from '../use-worklist-template-actions'
import { WorklistTemplateDialog } from './worklist-template-dialog'
import { WorklistCreateListForm, WorklistListMetadataForms } from './worklist-list-edit-forms'
import { canEditWorkspace } from '../permissions'

type WorklistListWorkspaceProps = Readonly<{
    state: ReturnType<typeof useWorklistPageState>
    listActions: ReturnType<typeof useWorklistListActions>
    templateActions: ReturnType<typeof useWorklistTemplateActions>
    activeList: WorklistList | undefined
    user: NonNullable<ReturnType<typeof useWorklistPageState>['user']>
}>

export const WorklistListWorkspace = ({ state, listActions, templateActions, activeList, user }: WorklistListWorkspaceProps): ReactElement => {
    const { lists, setLists, includeArchivedLists, setIncludeArchivedLists, setPageError, setPageNotice } = state
    const [locationOpen, setLocationOpen] = useState(false)
    const [budgetOpen, setBudgetOpen] = useState(false)
    const editable = canEditWorkspace(user.role)
    const archivedLists = lists.filter((list) => Boolean(list.archivedAt))

    const saveLocation = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault()
        if (!activeList) return
        const form = new FormData(event.currentTarget)
        const spaceName = String(form.get('spaceName') ?? '').trim()
        const folderName = String(form.get('folderName') ?? '').trim()
        if (!spaceName) return
        void updateWorklistList(activeList.id, { spaceName, folderName })
            .then((updated) => {
                setLists((current) => current.map((list) => list.id === updated.id ? updated : list))
                setPageNotice('List location updated.')
                setPageError('')
                setLocationOpen(false)
            })
            .catch((error: unknown) => setPageError(error instanceof Error ? error.message : 'Could not update the list location.'))
    }

    return (
        <div className="inline-flex items-center">
            {editable && <DropdownMenu>
                <DropdownMenuTrigger asChild><button aria-label={`List options for ${activeList?.name ?? 'current list'}`} className="grid size-7 place-items-center rounded-full text-[#74847a] transition hover:bg-[#eaf0e9] hover:text-[#244a37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#688b70]" type="button"><ChevronDown aria-hidden="true" className="size-4" /></button></DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-60 rounded-xl border-[#dce4da] p-1.5">
                    <DropdownMenuLabel className="px-2 py-1.5 text-[10px] uppercase tracking-[.13em] text-[#879188]">List options</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => setLocationOpen(true)}><Folder aria-hidden="true" />Move to space or folder</DropdownMenuItem>
                    <DropdownMenuItem onSelect={listActions.editListStatuses}><Workflow aria-hidden="true" />Manage statuses</DropdownMenuItem>
                    <DropdownMenuItem onSelect={listActions.editListDescription}><FileText aria-hidden="true" />{activeList?.description ? 'Edit description' : 'Add description'}</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setBudgetOpen(true)}><Settings2 aria-hidden="true" />Time budget</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { const next = !includeArchivedLists; setIncludeArchivedLists(next); void fetchWorklistLists(next).then(setLists).catch((error: unknown) => setPageError(error instanceof Error ? error.message : 'Could not load archived lists.')) }}><Archive aria-hidden="true" />{includeArchivedLists ? 'Hide archived lists' : 'Show archived lists'}</DropdownMenuItem>
                    {includeArchivedLists && archivedLists.map((list) => <DropdownMenuItem key={list.id} onSelect={() => listActions.restoreList(list.id)}><Archive aria-hidden="true" />Restore {list.name}</DropdownMenuItem>)}
                    {activeList && !activeList.isDefault && <><DropdownMenuSeparator /><DropdownMenuItem onSelect={listActions.renameList}><Pencil aria-hidden="true" />Rename list</DropdownMenuItem><DropdownMenuItem onSelect={listActions.duplicateList}><Copy aria-hidden="true" />Duplicate list</DropdownMenuItem><DropdownMenuItem className="text-[#526d58] focus:text-[#28543b]" onSelect={listActions.archiveList}><Archive aria-hidden="true" />Archive list</DropdownMenuItem><DropdownMenuItem className="text-rose-700 focus:text-rose-700" onSelect={listActions.deleteList}><Trash2 aria-hidden="true" />Delete empty list</DropdownMenuItem></>}
                </DropdownMenuContent>
            </DropdownMenu>}

            <WorklistCreateListForm activeList={activeList} listActions={listActions} state={state} user={user} />
            <WorklistTemplateDialog actions={templateActions} state={state} />
            <WorklistListMetadataForms activeList={activeList} listActions={listActions} state={state} user={user} />

            <Dialog onOpenChange={setLocationOpen} open={locationOpen}>
                <DialogContent className="max-w-lg rounded-2xl border-[#dce4da] p-6 sm:p-7">
                    <DialogHeader className="text-left"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#668356]">Workspace structure</p><DialogTitle className="font-serif text-2xl font-normal text-[#203d33]">Choose a home for this list</DialogTitle><DialogDescription>Spaces group related work. Folders are optional and help organize lists inside a space.</DialogDescription></DialogHeader>
                    <form className="mt-2 grid gap-4" onSubmit={saveLocation}>
                        <label className="grid gap-1.5 text-xs font-medium text-[#59665c]">Space<Input autoComplete="off" defaultValue={activeList?.spaceName ?? 'General'} list="worklist-space-options" maxLength={80} name="spaceName" placeholder="e.g. Marketing" required /><datalist id="worklist-space-options">{[...new Set(lists.map((list) => list.spaceName))].map((space) => <option key={space} value={space} />)}</datalist></label>
                        <label className="grid gap-1.5 text-xs font-medium text-[#59665c]">Folder <span className="font-normal text-[#879188]">· optional</span><Input autoComplete="off" defaultValue={activeList?.folderName ?? ''} list="worklist-folder-options" maxLength={80} name="folderName" placeholder="Leave empty to keep this list at the space level" /><datalist id="worklist-folder-options">{[...new Set(lists.map((list) => list.folderName).filter(Boolean))].map((folder) => <option key={folder} value={folder} />)}</datalist></label>
                        <DialogFooter className="mt-1"><Button onClick={() => setLocationOpen(false)} type="button" variant="outline">Cancel</Button><Button className="bg-[#173f35] text-white hover:bg-[#245246]" type="submit">Save location</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog onOpenChange={setBudgetOpen} open={budgetOpen}>
                <DialogContent className="max-w-md rounded-2xl border-[#dce4da] p-6 sm:p-7">
                    <DialogHeader className="text-left"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#668356]">List settings</p><DialogTitle className="font-serif text-2xl font-normal text-[#203d33]">Set a time budget</DialogTitle><DialogDescription>Track planned minutes against the time logged on tasks in this list.</DialogDescription></DialogHeader>
                    <form className="mt-2 grid gap-4" key={activeList?.id} onSubmit={(event) => { event.preventDefault(); const value = Number(new FormData(event.currentTarget).get('budgetMinutes')); void listActions.saveListBudget(value).then(() => setBudgetOpen(false)) }}>
                        <label className="grid gap-1.5 text-xs font-medium text-[#59665c]">Budget in minutes<Input aria-label="List time budget in minutes" defaultValue={activeList?.settings.budgetMinutes ?? 0} max={10000000} min={0} name="budgetMinutes" type="number" /></label>
                        <p className="text-xs text-[#879188]">Set to 0 to remove the budget. {activeList?.settings.budgetMinutes ? `Current budget: ${Math.floor(activeList.settings.budgetMinutes / 60)}h ${activeList.settings.budgetMinutes % 60}m.` : 'No budget is currently set.'}</p>
                        <DialogFooter><Button onClick={() => setBudgetOpen(false)} type="button" variant="outline">Cancel</Button><Button className="bg-[#173f35] text-white hover:bg-[#245246]" type="submit">Save budget</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
