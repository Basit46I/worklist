import type { FormEvent, ReactElement } from 'react'
import { Button, Input } from '@workspace/ui/primitives'
import type { TemplateBuilderActions, TemplateBuilderState } from '../template-dialog-types'

export const TemplateBuilderForm = ({ state, actions }: Readonly<{ state: TemplateBuilderState; actions: TemplateBuilderActions }>): ReactElement => (
    <form aria-label="Save workspace template" className="mx-auto max-w-3xl space-y-5" onSubmit={(event: FormEvent<HTMLFormElement>) => void actions.saveTemplate(event)}>
        <section className="rounded-xl border border-[#e2e8df] bg-white p-5">
            <div className="mb-4"><h3 className="text-sm font-semibold">Template details</h3><p className="mt-1 text-xs text-[#78847b]">Give teammates enough context to pick the right workflow.</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-xs font-medium text-[#59665c]">Name
                    <Input aria-label="Template name" autoFocus className="h-11 rounded-lg bg-[#fbfcfa]" maxLength={80} onChange={(event) => state.setTemplateNameDraft(event.target.value)} placeholder="e.g. Product launch" required value={state.templateNameDraft} />
                </label>
                <label className="space-y-1.5 text-xs font-medium text-[#59665c]">Description <span className="font-normal text-[#929b93]">· optional</span>
                    <Input aria-label="Template description" className="h-11 rounded-lg bg-[#fbfcfa]" maxLength={500} onChange={(event) => state.setTemplateDescriptionDraft(event.target.value)} placeholder="What kind of work is this for?" value={state.templateDescriptionDraft} />
                </label>
            </div>
        </section>
        <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-[#e2e8df] bg-white p-5"><FieldHeading number="01" title="Workflow statuses" help="One status per line · 2–12 statuses" />
                <textarea aria-label="Template statuses" className="min-h-40 w-full resize-y rounded-lg border border-[#dfe5dc] bg-[#fbfcfa] px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#8aa37c]" maxLength={500} onChange={(event) => state.setTemplateStatusesDraft(event.target.value)} required value={state.templateStatusesDraft} />
            </div>
            <div className="rounded-xl border border-[#e2e8df] bg-white p-5"><FieldHeading number="02" title="Starter tasks" help="One task per line · up to 50" />
                <textarea aria-label="Template task titles" className="min-h-40 w-full resize-y rounded-lg border border-[#dfe5dc] bg-[#fbfcfa] px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#8aa37c]" maxLength={10000} onChange={(event) => state.setTemplateTasksDraft(event.target.value)} placeholder={'Agree on goals\nAssign owners\nReview progress'} value={state.templateTasksDraft} />
                <p className="mt-2 text-xs text-[#78847b]">Tasks start in the first status, use Medium priority, and get due dates one day apart.</p>
            </div>
        </section>
        <div className="flex flex-wrap justify-end gap-2 border-t border-[#e4eae2] pt-4">
            <Button className="h-10 rounded-lg" onClick={() => { state.setShowTemplateBuilder(false); state.setTemplateEditingId('') }} type="button" variant="outline">Back to templates</Button>
            <Button className="h-10 rounded-lg bg-[#263b2d] px-5 text-white hover:bg-[#344d3a]" type="submit">{state.templateEditingId ? 'Save changes' : 'Save template'}</Button>
        </div>
    </form>
)

const FieldHeading = ({ number, title, help }: Readonly<{ number: string; title: string; help: string }>): ReactElement => (
    <div className="mb-3 flex items-center gap-2"><span className="grid size-7 place-items-center rounded-lg bg-[#edf4e8] text-[#58764b]">{number}</span><div><h3 className="text-sm font-semibold">{title}</h3><p className="text-xs text-[#78847b]">{help}</p></div></div>
)
