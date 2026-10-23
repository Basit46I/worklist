import type { useWorklistTemplateActions } from './use-worklist-template-actions'
import type { useWorklistPageState } from './use-worklist-page-state'

type PageState = ReturnType<typeof useWorklistPageState>
type TemplateActions = ReturnType<typeof useWorklistTemplateActions>

export type TemplateBuilderState = Pick<
    PageState,
    | 'templateEditingId'
    | 'templateNameDraft'
    | 'setTemplateNameDraft'
    | 'templateDescriptionDraft'
    | 'setTemplateDescriptionDraft'
    | 'templateStatusesDraft'
    | 'setTemplateStatusesDraft'
    | 'templateTasksDraft'
    | 'setTemplateTasksDraft'
    | 'setShowTemplateBuilder'
    | 'setTemplateEditingId'
>

export type TemplateLibraryState = Pick<
    PageState,
    | 'templates'
    | 'templateId'
    | 'setTemplateId'
    | 'templateListName'
    | 'setTemplateListName'
    | 'newListSpace'
    | 'setNewListSpace'
    | 'newListFolder'
    | 'setNewListFolder'
    | 'creatingTemplate'
    | 'setTemplateEditingId'
    | 'setTemplateNameDraft'
    | 'setTemplateDescriptionDraft'
    | 'setTemplateStatusesDraft'
    | 'setTemplateTasksDraft'
    | 'setShowTemplateBuilder'
>

export type TemplateBuilderActions = Pick<TemplateActions, 'saveTemplate'>
export type TemplateLibraryActions = Pick<TemplateActions, 'createFromTemplate' | 'editTemplate' | 'removeTemplate'>
