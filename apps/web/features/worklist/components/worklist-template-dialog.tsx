'use client'

import type { ReactElement } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@workspace/ui/primitives'
import type { useWorklistTemplateActions } from '../use-worklist-template-actions'
import type { useWorklistPageState } from '../use-worklist-page-state'
import type { TemplateBuilderState, TemplateLibraryState } from '../template-dialog-types'
import { TemplateBuilderForm } from './template-builder-form'
import { TemplateLibraryPanel } from './template-library-panel'

type PageState = ReturnType<typeof useWorklistPageState>
type TemplateActions = ReturnType<typeof useWorklistTemplateActions>
type Props = Readonly<{
    state: Pick<PageState, 'showTemplatePicker' | 'setShowTemplatePicker' | 'showTemplateBuilder' | 'setShowTemplateBuilder'> & TemplateBuilderState & TemplateLibraryState
    actions: TemplateActions
}>

export const WorklistTemplateDialog = ({ state, actions }: Props): ReactElement => (
    <Dialog onOpenChange={(open) => { state.setShowTemplatePicker(open); if (!open) state.setShowTemplateBuilder(false) }} open={state.showTemplatePicker}>
        <DialogContent aria-describedby="template-dialog-description" className="max-h-[88vh] max-w-5xl overflow-hidden rounded-2xl border-[#e1e7df] bg-[#f8faf7] p-0 text-[#26342a] shadow-2xl">
            <DialogHeader className="border-b border-[#e8ede6] bg-white px-6 py-5 pr-12 text-left sm:px-7">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#668356]">Workspace templates</p>
                <DialogTitle className="mt-1 text-xl tracking-tight">{state.showTemplateBuilder ? (state.templateEditingId ? 'Edit template' : 'Create a template') : 'Start with a template'}</DialogTitle>
                <DialogDescription id="template-dialog-description">{state.showTemplateBuilder ? 'Define a reusable workflow and starter tasks for your team.' : 'Choose a reusable workflow, preview what it creates, and name your new list.'}</DialogDescription>
            </DialogHeader>
            <div className="max-h-[calc(88vh-6.5rem)] overflow-y-auto p-5 sm:p-7">
                {state.showTemplateBuilder ? <TemplateBuilderForm actions={actions} state={state} /> : <TemplateLibraryPanel actions={actions} state={state} />}
            </div>
        </DialogContent>
    </Dialog>
)
