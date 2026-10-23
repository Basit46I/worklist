import type { ReactElement } from 'react'
import { Check, ChevronRight, ListChecks, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button, Input } from '@workspace/ui/primitives'
import type { WorklistTemplate } from '../api'
import type { TemplateLibraryActions, TemplateLibraryState } from '../template-dialog-types'

export const TemplateLibraryPanel = ({ state, actions }: Readonly<{ state: TemplateLibraryState; actions: TemplateLibraryActions }>): ReactElement => {
    const selected = state.templates.find((template) => template.id === state.templateId)
    return <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="space-y-4">
            <header className="flex items-end justify-between gap-3"><div><h3 className="text-sm font-semibold">Your workspace library</h3><p className="mt-1 text-xs text-[#78847b]">{state.templates.length} {state.templates.length === 1 ? 'template' : 'templates'} · shared with teammates</p></div>
                <Button className="h-9 shrink-0 rounded-lg px-3 text-xs font-semibold shadow-sm transition-colors hover:bg-primary/90" onClick={() => startTemplateCreation(state)} size="sm" variant="default"><Plus aria-hidden="true" className="mr-1.5 size-4" />New template</Button>
            </header>
            {state.templates.length ? <ul className="space-y-2">{state.templates.map((template) => <li key={template.id}><TemplateOption selected={template.id === state.templateId} template={template} onSelect={() => state.setTemplateId(template.id)} /></li>)}</ul> : <EmptyLibrary />}
        </section>
        <section aria-label="Template preview" className="flex min-h-[26rem] flex-col rounded-2xl border border-[#e1e8df] bg-white p-5 shadow-sm sm:p-6">
            {selected ? <TemplatePreview actions={actions} state={state} template={selected} /> : <EmptyPreview />}
        </section>
    </div>
}

const TemplateOption = ({ template, selected, onSelect }: Readonly<{ template: WorklistTemplate; selected: boolean; onSelect: () => void }>): ReactElement => (
    <button aria-pressed={selected} className={`w-full rounded-xl border p-4 text-left transition-colors ${selected ? 'border-[#91a886] bg-[#f0f5ec] shadow-sm' : 'border-[#e3e9e1] bg-white hover:border-[#bac9b3] hover:bg-[#fbfcfa]'}`} onClick={onSelect} type="button">
        <span className="flex items-start justify-between gap-3"><span className="min-w-0"><span className="block truncate text-sm font-semibold text-[#29382d]">{template.name}</span><span className="mt-1 block line-clamp-2 text-xs leading-5 text-[#758078]">{template.description || 'A reusable workflow for your workspace.'}</span></span><span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-[#667267]">{template.tasks.length} tasks</span></span>
        <span className="mt-3 flex flex-wrap gap-1.5">{template.statuses.slice(0, 4).map((status, index) => <span className={`rounded-full px-2 py-1 text-[10px] ${index === 0 ? 'bg-[#e8efe3] text-[#526b47]' : 'bg-[#f2f4f1] text-[#69746b]'}`} key={`${template.id}-${status}`}>{status}</span>)}{template.statuses.length > 4 && <span className="px-1 py-1 text-[10px] text-[#79847b]">+{template.statuses.length - 4}</span>}</span>
    </button>
)

const TemplatePreview = ({ template, state, actions }: Readonly<{ template: WorklistTemplate; state: TemplateLibraryState; actions: TemplateLibraryActions }>): ReactElement => (
    <>
        <header className="flex items-start justify-between gap-3"><div><span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf4e8] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#58764b]"><ListChecks aria-hidden="true" className="size-3" />Template preview</span><h3 className="mt-3 text-lg font-semibold tracking-tight">{template.name}</h3><p className="mt-1 text-sm leading-6 text-[#758078]">{template.description || 'A reusable workflow for your workspace.'}</p></div><span className="rounded-lg bg-[#f5f7f4] px-2.5 py-1.5 text-xs text-[#677269]">{template.statuses.length} statuses</span></header>
        <WorkflowPreview statuses={template.statuses} />
        <StarterTaskPreview template={template} />
        <form className="mt-5 space-y-3 border-t border-[#e9eee7] pt-4" onSubmit={(event) => void actions.createFromTemplate(event)}>
            <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1.5 text-xs font-medium text-[#59665c] sm:col-span-2">Name your new list<Input aria-label="Template list name" className="h-10 rounded-lg bg-[#fbfcfa]" maxLength={80} onChange={(event) => state.setTemplateListName(event.target.value)} placeholder="e.g. Website launch — Q4" required value={state.templateListName} /></label>
                <label className="space-y-1.5 text-xs font-medium text-[#59665c]">Space<Input aria-label="Template list space" className="h-10 rounded-lg bg-[#fbfcfa]" maxLength={80} onChange={(event) => state.setNewListSpace(event.target.value)} value={state.newListSpace} /></label>
                <label className="space-y-1.5 text-xs font-medium text-[#59665c]">Folder <span className="font-normal text-[#929b93]">· optional</span><Input aria-label="Template list folder" className="h-10 rounded-lg bg-[#fbfcfa]" maxLength={80} onChange={(event) => state.setNewListFolder(event.target.value)} placeholder="Leave blank for no folder" value={state.newListFolder} /></label>
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-2"><div className="flex gap-2"><Button className="h-9 rounded-lg" onClick={actions.editTemplate} size="sm" type="button" variant="outline"><Pencil aria-hidden="true" className="mr-1.5 size-3.5" />Edit</Button><Button className="h-9 rounded-lg text-rose-700" onClick={actions.removeTemplate} size="sm" type="button" variant="ghost"><Trash2 aria-hidden="true" className="mr-1.5 size-3.5" />Delete</Button></div>
                <Button className="h-10 rounded-lg px-4 font-semibold shadow-sm transition-colors hover:bg-primary/90" disabled={state.creatingTemplate} type="submit" variant="default">{state.creatingTemplate ? 'Creating list…' : <>Use template <ChevronRight aria-hidden="true" className="ml-1 size-4" /></>}</Button>
            </footer>
        </form>
    </>
)

const WorkflowPreview = ({ statuses }: Readonly<{ statuses: readonly string[] }>): ReactElement => <div className="mt-5"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a958b]">Workflow</p><div className="mt-2 flex flex-wrap gap-2">{statuses.map((status, index) => <span className="inline-flex items-center gap-2 rounded-lg border border-[#e5eae3] bg-[#fbfcfa] px-2.5 py-1.5 text-xs text-[#4b584d]" key={`${status}-${index}`}><span aria-hidden="true" className={`size-1.5 rounded-full ${index === 0 ? 'bg-[#7da268]' : 'bg-[#aab3aa]'}`} />{status}</span>)}</div></div>

const StarterTaskPreview = ({ template }: Readonly<{ template: WorklistTemplate }>): ReactElement => <div className="mt-5 min-h-0 flex-1"><div className="mb-2 flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a958b]">Starter tasks</p><span className="text-xs text-[#78847b]">{template.tasks.length} items</span></div>
    {template.tasks.length ? <ul className="max-h-40 divide-y divide-[#edf0eb] overflow-y-auto rounded-lg border border-[#e7ece5] px-3">{template.tasks.slice(0, 8).map((task, index) => <li className="flex items-center gap-2.5 py-2.5 text-xs text-[#435047]" key={`${template.id}-${index}`}><span className="grid size-4 shrink-0 place-items-center rounded border border-[#d9e2d5] text-[#75916a]"><Check aria-hidden="true" className="size-3" /></span><span className="min-w-0 flex-1 truncate">{task.title}</span><span className="shrink-0 rounded-full bg-[#f3f5f2] px-2 py-0.5 text-[10px] text-[#737f75]">{task.status}</span></li>)}</ul> : <p className="rounded-lg border border-dashed border-[#e1e8df] px-3 py-5 text-center text-xs text-[#7c877e]">This template starts with an empty list.</p>}
    {template.tasks.length > 8 && <p className="mt-1.5 text-right text-[10px] text-[#78847b]">and {template.tasks.length - 8} more tasks</p>}
</div>

const EmptyLibrary = (): ReactElement => <div className="rounded-xl border border-dashed border-[#cbd6c8] bg-white px-5 py-10 text-center"><span className="mx-auto grid size-10 place-items-center rounded-xl bg-[#edf4e8] text-[#668356]"><ListChecks aria-hidden="true" className="size-5" /></span><h3 className="mt-3 text-sm font-semibold">Your template library is empty</h3><p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-[#78847b]">Create a repeatable workflow once. Your teammates can use it whenever they start a similar list.</p></div>
const EmptyPreview = (): ReactElement => <div className="m-auto max-w-sm text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#edf4e8] text-[#668356]"><ListChecks aria-hidden="true" className="size-6" /></span><h3 className="mt-4 text-base font-semibold">Pick a workflow to preview</h3><p className="mt-1 text-sm leading-6 text-[#78847b]">Select a template from the library to see its statuses and starter tasks before creating a list.</p></div>

const startTemplateCreation = (state: TemplateLibraryState): void => {
    state.setTemplateEditingId('')
    state.setTemplateNameDraft('')
    state.setTemplateDescriptionDraft('')
    state.setTemplateStatusesDraft('To do\nIn progress\nDone')
    state.setTemplateTasksDraft('')
    state.setShowTemplateBuilder(true)
}
