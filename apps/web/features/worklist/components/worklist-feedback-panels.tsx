'use client'

import type { ReactElement } from 'react'
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input } from '@workspace/ui/primitives'
import type { useWorklistPageState } from '../use-worklist-page-state'
import type { useWorklistSavedViews } from '../use-worklist-saved-views'

type WorklistFeedbackPanelsProps = Readonly<{
    state: ReturnType<typeof useWorklistPageState>
    savedViewActions: ReturnType<typeof useWorklistSavedViews>
}>

export const WorklistFeedbackPanels = ({ state, savedViewActions }: WorklistFeedbackPanelsProps): ReactElement => {
    const { pageError, pageNotice, showSaveViewForm, setShowSaveViewForm, savedViewNameDraft, setSavedViewNameDraft, bulkResults } = state

    return (
        <>
            {pageError && (
                <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700" role="alert">
                    {pageError}
                </p>
            )}
            {pageNotice && (
                <p className="mb-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700" role="status">
                    {pageNotice}
                </p>
            )}
            <Dialog onOpenChange={setShowSaveViewForm} open={showSaveViewForm}>
                <DialogContent className="rounded-2xl border-[#dce4da] sm:max-w-md">
                    <DialogHeader className="text-left"><DialogTitle>Save this view</DialogTitle><DialogDescription>Give these filters, grouping, and sorting a name so you can return to them later.</DialogDescription></DialogHeader>
                    <form className="grid gap-4" onSubmit={savedViewActions.submitSavedView}>
                        <label className="text-xs font-medium text-[#59665c]">View name<Input aria-label="Saved view name" autoFocus className="mt-1 h-10" maxLength={60} onChange={(event) => setSavedViewNameDraft(event.target.value)} placeholder="e.g. Open tasks" required value={savedViewNameDraft} /></label>
                        <p className="text-xs text-[#718076]">This view is private to you.</p>
                        <DialogFooter><Button className="bg-[#174638] text-white hover:bg-[#205642]" type="submit">Save view</Button><Button onClick={() => setShowSaveViewForm(false)} type="button" variant="ghost">Cancel</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            {bulkResults.length > 0 && (
                <details className="mb-4 rounded-lg border border-slate-200 bg-white p-3 text-sm">
                    <summary className="cursor-pointer font-medium text-slate-700">Show item-by-item results</summary>
                    <ul className="mt-2 divide-y divide-slate-100">
                        {bulkResults.map((result) => (
                            <li className="flex flex-wrap justify-between gap-2 py-1.5" key={result.itemId}>
                                <span className="text-slate-700">{result.title}</span>
                                <span className={result.outcome.startsWith('Failed') ? 'text-rose-700' : 'text-slate-500'}>{result.outcome}</span>
                            </li>
                        ))}
                    </ul>
                </details>
            )}
        </>
    )
}
