'use client'

import type { Dispatch, FormEvent, SetStateAction } from 'react'
import {
    createWorkItem,
    createWorklistList,
    createWorklistTemplate,
    deleteWorklistTemplate,
    updateWorklistTemplate,
    type WorklistList,
    type WorklistSpace,
    type WorklistTemplate
} from './api'
import type { WorkItem } from './model'
import { addUtcDays } from './templates'
import { buildTemplateInput } from './template-rules'

type UseWorklistTemplateActionsOptions = Readonly<{
    templates: readonly WorklistTemplate[]
    setTemplates: Dispatch<SetStateAction<readonly WorklistTemplate[]>>
    templateId: string
    setTemplateId: Dispatch<SetStateAction<string>>
    templateListName: string
    setTemplateListName: Dispatch<SetStateAction<string>>
    creatingTemplate: boolean
    setCreatingTemplate: Dispatch<SetStateAction<boolean>>
    templateEditingId: string
    setTemplateEditingId: Dispatch<SetStateAction<string>>
    templateNameDraft: string
    setTemplateNameDraft: Dispatch<SetStateAction<string>>
    templateDescriptionDraft: string
    setTemplateDescriptionDraft: Dispatch<SetStateAction<string>>
    templateStatusesDraft: string
    setTemplateStatusesDraft: Dispatch<SetStateAction<string>>
    templateTasksDraft: string
    setTemplateTasksDraft: Dispatch<SetStateAction<string>>
    newListSpace: string
    setNewListSpace: Dispatch<SetStateAction<string>>
    newListFolder: string
    setNewListFolder: Dispatch<SetStateAction<string>>
    setLists: Dispatch<SetStateAction<readonly WorklistList[]>>
    setSpaces: Dispatch<SetStateAction<readonly WorklistSpace[]>>
    setItems: Dispatch<SetStateAction<readonly WorkItem[]>>
    setShowTemplatePicker: Dispatch<SetStateAction<boolean>>
    setShowTemplateBuilder: Dispatch<SetStateAction<boolean>>
    selectList: (list: WorklistList) => void
    setPageError: (message: string) => void
    setPageNotice: (message: string) => void
}>

export const useWorklistTemplateActions = (options: UseWorklistTemplateActionsOptions) => {
    const createFromTemplate = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault()
        const template = options.templates.find((candidate) => candidate.id === options.templateId)
        const name = options.templateListName.trim()
        if (!template || !name || options.creatingTemplate) return
        options.setCreatingTemplate(true)
        let created: WorklistList | null = null
        try {
            created = await createWorklistList(
                name,
                template.description,
                options.newListSpace.trim() || 'General',
                options.newListFolder.trim(),
                template.statuses
            )
            options.setLists((current) => [...current.filter((list) => list.id !== created?.id), created as WorklistList])
            if (created.spaceId) {
                const createdSpace = { id: created.spaceId, name: created.spaceName, description: '', archivedAt: null }
                options.setSpaces((current) => current.some((space) => space.id === createdSpace.id) ? current : [...current, createdSpace])
            }
            const createdItems: WorkItem[] = []
            for (const task of template.tasks)
                createdItems.push(
                    await createWorkItem({
                        listId: created.id,
                        title: task.title,
                        description: task.description,
                        status: task.status,
                        priority: task.priority,
                        assignee: 'Unassigned',
                        dueDate: addUtcDays(task.dueDateOffsetDays)
                    })
                )
            options.selectList(created)
            options.setTemplateListName('')
            options.setNewListSpace('General')
            options.setNewListFolder('')
            options.setShowTemplatePicker(false)
            options.setItems(createdItems)
            options.setPageNotice(`“${created.name}” created from the ${template.name} template.`)
            options.setPageError('')
        } catch (error) {
            if (created) {
                options.selectList(created)
                options.setPageError(
                    `The list was created, but not all template tasks could be added. ${error instanceof Error ? error.message : 'Try adding the remaining tasks again.'}`
                )
            } else options.setPageError(error instanceof Error ? error.message : 'Could not create a list from this template.')
        } finally {
            options.setCreatingTemplate(false)
        }
    }

    const editTemplate = (): void => {
        const template = options.templates.find((candidate) => candidate.id === options.templateId)
        if (!template) return
        options.setTemplateEditingId(template.id)
        options.setTemplateNameDraft(template.name)
        options.setTemplateDescriptionDraft(template.description)
        options.setTemplateStatusesDraft(template.statuses.join('\n'))
        options.setTemplateTasksDraft(template.tasks.map((task) => task.title).join('\n'))
        options.setShowTemplateBuilder(true)
    }

    const saveTemplate = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault()
        const oldTemplate = options.templates.find((template) => template.id === options.templateEditingId)
        const result = buildTemplateInput(
            options.templateNameDraft,
            options.templateDescriptionDraft,
            options.templateStatusesDraft,
            options.templateTasksDraft,
            oldTemplate
        )
        if (!result.ok) {
            options.setPageError(result.error)
            return
        }
        try {
            const saved = options.templateEditingId
                ? await updateWorklistTemplate(options.templateEditingId, result.input)
                : await createWorklistTemplate(result.input)
            options.setTemplates((current) =>
                [...current.filter((template) => template.id !== saved.id), saved].sort((left, right) => left.name.localeCompare(right.name))
            )
            options.setTemplateId(saved.id)
            options.setTemplateEditingId('')
            options.setShowTemplateBuilder(false)
            options.setPageNotice(`Template “${saved.name}” saved for your workspace.`)
            options.setPageError('')
        } catch (error) {
            options.setPageError(error instanceof Error ? error.message : 'Could not save template.')
        }
    }

    const removeTemplate = (): void => {
        const template = options.templates.find((candidate) => candidate.id === options.templateId)
        if (!template || !window.confirm(`Delete the “${template.name}” template for everyone in this workspace?`)) return
        void deleteWorklistTemplate(template.id)
            .then(() => {
                const remaining = options.templates.filter((candidate) => candidate.id !== template.id)
                options.setTemplates(remaining)
                options.setTemplateId(remaining[0]?.id ?? '')
                options.setPageNotice('Template deleted from the workspace.')
                options.setPageError('')
            })
            .catch((error: unknown) => options.setPageError(error instanceof Error ? error.message : 'Could not delete template.'))
    }

    return { createFromTemplate, editTemplate, saveTemplate, removeTemplate } as const
}
