import type { FormEvent } from 'react'
import { archiveWorklistList, createWorklistList, deleteWorklistList, duplicateWorklistList, restoreWorklistList, updateWorklistList, type WorklistList } from './api'
import type { UseWorklistListActionsOptions } from './use-worklist-list-actions.types'

type SelectList = (list: WorklistList) => void
export const createWorklistListLifecycleActions = (options: UseWorklistListActionsOptions, selectList: SelectList) => {
    const saveListName = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault()
        const name = options.listNameDraft.trim()
        if (!name) return
        try {
            const created = await createWorklistList(
                name,
                options.newListDescription.trim(),
                options.newListSpace.trim() || 'General',
                options.newListFolder.trim()
            )
            options.setLists((current) => [...current.filter((list) => list.id !== created.id), created])
            options.setListNameDraft('')
            options.setNewListDescription('')
            options.setNewListSpace('General')
            options.setNewListFolder('')
            options.setShowListForm(false)
            selectList(created)
            options.setPageNotice(`List “${created.name}” created in ${created.spaceName}${created.folderName ? ` / ${created.folderName}` : ''}.`)
            options.setPageError('')
        } catch (error) {
            options.setPageError(error instanceof Error ? error.message : 'Could not create list.')
        }
    }

    const renameList = (): void => {
        const list = options.lists.find((candidate) => candidate.id === options.activeListId)
        if (!list || list.isDefault) return
        const name = window.prompt('Rename list', list.name)?.trim()
        if (!name || name === list.name) return
        void updateWorklistList(list.id, { name })
            .then((updated) => {
                options.setLists((current) => current.map((candidate) => (candidate.id === updated.id ? updated : candidate)))
                options.setPageNotice('List renamed.')
                options.setPageError('')
            })
            .catch((error: unknown) => options.setPageError(error instanceof Error ? error.message : 'Could not rename list.'))
    }
    const duplicateList = (): void => {
        const list = options.lists.find((candidate) => candidate.id === options.activeListId)
        if (!list) return
        const name = window.prompt('Name the copied list', `${list.name} copy`)?.trim()
        if (!name) return
        void duplicateWorklistList(list.id, name)
            .then((copy) => {
                options.setLists((current) => [...current, copy])
                selectList(copy)
                options.setPageNotice('List copied with its view settings.')
                options.setPageError('')
            })
            .catch((error: unknown) => options.setPageError(error instanceof Error ? error.message : 'Could not copy list.'))
    }
    const archiveList = (): void => {
        const list = options.lists.find((candidate) => candidate.id === options.activeListId)
        if (!list || list.isDefault) return
        void archiveWorklistList(list.id)
            .then((archived) => {
                options.setLists((current) => current.map((candidate) => (candidate.id === archived.id ? archived : candidate)))
                const fallback = options.lists.find((candidate) => candidate.isDefault && !candidate.archivedAt)
                if (fallback) selectList(fallback)
                options.setPageNotice('List archived. Its tasks are still available when you restore it.')
                options.setPageError('')
            })
            .catch((error: unknown) => options.setPageError(error instanceof Error ? error.message : 'Could not archive list.'))
    }
    const restoreList = (listId: string): void => {
        void restoreWorklistList(listId)
            .then((restored) => {
                options.setLists((current) => current.map((candidate) => (candidate.id === restored.id ? restored : candidate)))
                options.setPageNotice(`“${restored.name}” restored.`)
                options.setPageError('')
            })
            .catch((error: unknown) => options.setPageError(error instanceof Error ? error.message : 'Could not restore list.'))
    }
    const deleteList = (): void => {
        const list = options.lists.find((candidate) => candidate.id === options.activeListId)
        if (
            !list ||
            list.isDefault ||
            !window.confirm(`Permanently delete empty list “${list.name}”? Lists with tasks cannot be deleted; archive it instead.`)
        )
            return
        void deleteWorklistList(list.id)
            .then(() => {
                options.setLists((current) => current.filter((candidate) => candidate.id !== list.id))
                const fallback = options.lists.find((candidate) => candidate.isDefault)
                if (fallback) selectList(fallback)
                options.setPageNotice('Empty list deleted.')
                options.setPageError('')
            })
            .catch((error: unknown) => options.setPageError(error instanceof Error ? error.message : 'Could not delete list.'))
    }

    return { saveListName, renameList, duplicateList, archiveList, restoreList, deleteList } as const
}
