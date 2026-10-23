import type { FormEvent } from 'react'
import { updateWorklistList } from './api'
import type { UseWorklistListActionsOptions } from './use-worklist-list-actions.types'
import { canEditWorkspace } from './permissions'

export const createWorklistListSettingsActions = (options: UseWorklistListActionsOptions) => {
    const editListLocation = (field: 'spaceName' | 'folderName'): void => {
        const list = options.lists.find((candidate) => candidate.id === options.activeListId)
        if (!list) return
        const current = field === 'spaceName' ? list.spaceName : list.folderName
        const next = window.prompt(field === 'spaceName' ? 'Space name' : 'Folder name (leave blank for none)', current)?.trim()
        if (next === undefined || (field === 'spaceName' && !next) || next === current) return
        void updateWorklistList(list.id, { [field]: next })
            .then((updated) => {
                options.setLists((currentLists) => currentLists.map((candidate) => (candidate.id === updated.id ? updated : candidate)))
                options.setPageNotice(`${field === 'spaceName' ? 'Space' : 'Folder'} updated.`)
                options.setPageError('')
            })
            .catch((error: unknown) => options.setPageError(error instanceof Error ? error.message : 'Could not update list location.'))
    }

    const editListStatuses = (): void => {
        const list = options.lists.find((candidate) => candidate.id === options.activeListId)
        if (!list || !options.user || !canEditWorkspace(options.user.role)) return
        options.setStatusDraft(list.settings.statuses.join('\n'))
        options.setShowStatusForm((open) => !open)
    }
    const saveListStatuses = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault()
        const list = options.lists.find((candidate) => candidate.id === options.activeListId)
        if (!list) return
        const statuses = [
            ...new Set(
                options.statusDraft
                    .split('\n')
                    .map((status) => status.trim())
                    .filter(Boolean)
            )
        ]
        if (statuses.length < 2 || statuses.length > 12) {
            options.setPageError('A list needs 2 to 12 unique statuses.')
            return
        }
        void updateWorklistList(list.id, { settings: { ...list.settings, statuses } })
            .then((updated) => {
                options.setLists((current) => current.map((candidate) => (candidate.id === updated.id ? updated : candidate)))
                if (options.statusFilter !== 'All' && !statuses.includes(options.statusFilter)) options.setStatusFilter('All')
                options.setShowStatusForm(false)
                options.setPageNotice("This list's status workflow has been saved.")
                options.setPageError('')
            })
            .catch((error: unknown) => options.setPageError(error instanceof Error ? error.message : 'Could not save statuses.'))
    }

    const editListDescription = (): void => {
        const list = options.lists.find((candidate) => candidate.id === options.activeListId)
        if (!list) return
        options.setDescriptionDraft(list.description ?? '')
        options.setShowDescriptionForm(true)
    }
    const saveListDescription = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault()
        const list = options.lists.find((candidate) => candidate.id === options.activeListId)
        if (!list) return
        void updateWorklistList(list.id, { description: options.descriptionDraft.trim() })
            .then((updated) => {
                options.setLists((current) => current.map((candidate) => (candidate.id === updated.id ? updated : candidate)))
                options.setShowDescriptionForm(false)
                options.setPageNotice('List description saved.')
                options.setPageError('')
            })
            .catch((error: unknown) => options.setPageError(error instanceof Error ? error.message : 'Could not save description.'))
    }
    const saveListBudget = async (budgetMinutes: number): Promise<void> => {
        const list = options.lists.find((candidate) => candidate.id === options.activeListId)
        if (!list || !Number.isSafeInteger(budgetMinutes) || budgetMinutes < 0 || budgetMinutes > 10_000_000) return
        try {
            const updated = await updateWorklistList(list.id, { settings: { ...list.settings, budgetMinutes } })
            options.setLists((current) => current.map((candidate) => candidate.id === updated.id ? updated : candidate))
            options.setPageNotice(budgetMinutes ? 'List time budget saved.' : 'List time budget cleared.')
            options.setPageError('')
        } catch (error) {
            options.setPageError(error instanceof Error ? error.message : 'Could not save the list budget.')
        }
    }

    return { editListLocation, editListStatuses, saveListStatuses, editListDescription, saveListDescription, saveListBudget } as const
}
