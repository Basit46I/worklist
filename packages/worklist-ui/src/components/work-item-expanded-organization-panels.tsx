'use client'

import type { ReactElement } from 'react'
import { Button, Input } from '@workspace/ui/primitives'
import type { WorkItem } from '../model/index.js'

type OrganizationProps = Readonly<{
    item: WorkItem
    dependencyCandidates: readonly WorkItem[]
    canEdit: boolean
    checklistDraft: string
    tagDraft: string
    onChecklistDraftChange: (value: string) => void
    onTagDraftChange: (value: string) => void
    onUpdate: (itemId: string, changes: Partial<WorkItem>) => void
}>

export const WorkItemExpandedOrganizationPanels = ({ item, dependencyCandidates, canEdit, checklistDraft, tagDraft, onChecklistDraftChange, onTagDraftChange, onUpdate }: OrganizationProps): ReactElement => (
    <>
        <section aria-label="Task checklist" className="border-t border-slate-100 pt-3 sm:col-span-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">Checklist</h3>
            <ul className="mt-2 space-y-1">
                {(item.checklist ?? []).map((entry) => <li className="flex items-center gap-2 text-sm" key={entry.id}>
                    <input aria-label={`${entry.completed ? 'Mark incomplete' : 'Complete'} ${entry.text}`} checked={entry.completed} disabled={!canEdit} onChange={() => { onUpdate(item.id, { checklist: (item.checklist ?? []).map((candidate) => candidate.id === entry.id ? { ...candidate, completed: !candidate.completed } : candidate) }) }} type="checkbox" />
                    <span className={entry.completed ? 'text-slate-400 line-through' : 'text-slate-700'}>{entry.text}</span>
                    {canEdit && <button aria-label={`Remove ${entry.text}`} className="ml-auto text-xs text-slate-400 hover:text-rose-600" onClick={() => { onUpdate(item.id, { checklist: (item.checklist ?? []).filter((candidate) => candidate.id !== entry.id) }) }} type="button">Remove</button>}
                </li>)}
            </ul>
            {canEdit && <form className="mt-2 flex max-w-lg gap-2" onSubmit={(event) => { event.preventDefault(); const text = checklistDraft.trim(); if (!text) return; onUpdate(item.id, { checklist: [...(item.checklist ?? []), { id: crypto.randomUUID(), text, completed: false }] }); onChecklistDraftChange('') }}>
                <Input aria-label="New checklist item" className="h-8" maxLength={240} onChange={(event) => { onChecklistDraftChange(event.target.value) }} placeholder="Add a checklist step" value={checklistDraft} />
                <Button className="h-8" disabled={!checklistDraft.trim()} type="submit" variant="outline">Add step</Button>
            </form>}
            {!item.checklist?.length && <p className="mt-1 text-sm text-slate-500">No checklist steps yet.</p>}
        </section>
        <section aria-label="Task labels" className="border-t border-slate-100 pt-3 sm:col-span-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">Labels</h3>
            <div className="mt-2 flex flex-wrap gap-2">
                {(item.tags ?? []).map((tag) => <span className="inline-flex items-center gap-1 rounded-full bg-[#eef4e9] px-2.5 py-1 text-xs text-[#405d39]" key={tag}>
                    {tag}{canEdit && <button aria-label={`Remove label ${tag}`} className="font-semibold text-[#71856a] hover:text-rose-600" onClick={() => { onUpdate(item.id, { tags: (item.tags ?? []).filter((entry) => entry !== tag) }) }} type="button">×</button>}
                </span>)}
                {!(item.tags?.length) && <span className="text-sm text-slate-500">No labels yet.</span>}
            </div>
            {canEdit && <form className="mt-2 flex max-w-lg gap-2" onSubmit={(event) => { event.preventDefault(); const tag = tagDraft.trim().replace(/^#/, ''); if (!tag || (item.tags ?? []).some((entry) => entry.toLocaleLowerCase() === tag.toLocaleLowerCase()) || (item.tags ?? []).length >= 20) return; onUpdate(item.id, { tags: [...(item.tags ?? []), tag] }); onTagDraftChange('') }}>
                <Input aria-label="New task label" className="h-8" maxLength={32} onChange={(event) => { onTagDraftChange(event.target.value) }} placeholder="Add a label" value={tagDraft} />
                <Button className="h-8" disabled={!tagDraft.trim() || (item.tags?.length ?? 0) >= 20} type="submit" variant="outline">Add label</Button>
            </form>}
        </section>
        <fieldset className="text-xs text-slate-500 sm:col-span-2">
            <legend>Blocked by</legend>
            <div aria-label={`Dependencies for ${item.title}`} className="mt-1 max-h-32 overflow-y-auto rounded-md border border-slate-200 bg-white p-2">
                {dependencyCandidates.length ? dependencyCandidates.map((candidate) => <label className="flex items-center gap-2 py-1 text-sm text-slate-700" key={candidate.id}>
                    <input checked={(item.dependsOn ?? []).includes(candidate.id)} disabled={!canEdit} onChange={(event) => { const selected = new Set(item.dependsOn ?? []); if (event.target.checked) selected.add(candidate.id); else selected.delete(candidate.id); onUpdate(item.id, { dependsOn: [...selected] }) }} type="checkbox" />
                    <span className="min-w-0 flex-1 truncate">{candidate.title}</span><span className="text-xs text-slate-400">{candidate.status}</span>
                </label>) : <p>No other tasks in this list.</p>}
            </div>
        </fieldset>
        <label className="text-xs text-slate-500">Repeat task
            <select aria-label={`Repeat ${item.title}`} className="mt-1 block h-8 rounded-md border border-slate-200 bg-white px-2 text-sm" disabled={!canEdit} onChange={(event) => { onUpdate(item.id, { recurrence: event.target.value ? { frequency: event.target.value as 'daily' | 'weekly' | 'monthly', interval: 1 } : null }) }} value={item.recurrence?.frequency ?? ''}>
                <option value="">Does not repeat</option><option value="daily">Every day</option><option value="weekly">Every week</option><option value="monthly">Every month</option>
            </select>
        </label>
    </>
)
