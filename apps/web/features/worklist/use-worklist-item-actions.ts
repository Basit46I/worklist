import type { Dispatch, FormEvent, MutableRefObject, SetStateAction } from 'react'
import { createWorkItem, deleteWorkItem, duplicateWorkItem, setWorkItemArchived, updateWorkItem } from './api'
import type { WorkItem, WorkItemPriority, WorkItemStatus } from './model'
import type { WorkItemClientRequest } from './model'
import { dateInOneWeek } from '@workspace/worklist-ui'

type Setter<T> = Dispatch<SetStateAction<T>>

type WorklistItemActionsOptions = Readonly<{
    activeListId: string
    activeStatuses: readonly WorkItemStatus[]
    items: readonly WorkItem[]
    setItems: Setter<readonly WorkItem[]>
    newTitle: string
    newDescription: string
    newStatus: WorkItemStatus
    newPriority: WorkItemPriority
    newAssignee: string
    newDueDate: string
    setNewTitle: Setter<string>
    setNewDescription: Setter<string>
    setNewStatus: Setter<WorkItemStatus>
    setNewPriority: Setter<WorkItemPriority>
    setNewAssignee: Setter<string>
    setNewDueDate: Setter<string>
    setShowNewItem: Setter<boolean>
    setStatusFilter: Setter<WorkItemStatus | 'All'>
    setPageError: Setter<string>
    setPageNotice: Setter<string>
    itemUpdateRevisions: MutableRefObject<Map<string, number>>
}>

export const useWorklistItemActions = ({
    activeListId,
    activeStatuses,
    items,
    setItems,
    newTitle,
    newDescription,
    newStatus,
    newPriority,
    newAssignee,
    newDueDate,
    setNewTitle,
    setNewDescription,
    setNewStatus,
    setNewPriority,
    setNewAssignee,
    setNewDueDate,
    setShowNewItem,
    setStatusFilter,
    setPageError,
    setPageNotice,
    itemUpdateRevisions
}: WorklistItemActionsOptions) => {
    const createItem = async (event: FormEvent<HTMLFormElement>, clientRequest: WorkItemClientRequest | null = null): Promise<void> => {
        event.preventDefault()
        const title = newTitle.trim()
        if (!title) return

        try {
            const item = await createWorkItem({
                listId: activeListId,
                title,
                description: newDescription.trim(),
                status: activeStatuses.includes(newStatus) ? newStatus : (activeStatuses[0] ?? 'To do'),
                priority: newPriority,
                assignee: newAssignee.trim() || 'Unassigned',
                dueDate: newDueDate,
                clientRequest
            })
            setItems((current) => [item, ...current])
            setNewTitle('')
            setNewDescription('')
            setNewStatus(activeStatuses[0] ?? 'To do')
            setNewPriority('Medium')
            setNewAssignee('Unassigned')
            setNewDueDate(dateInOneWeek())
            setShowNewItem(false)
            setStatusFilter('All')
            setPageError('')
            setPageNotice('Task created.')
        } catch (error) {
            setPageError(error instanceof Error ? error.message : 'Could not create task.')
        }
    }

    const createSubtask = (parentId: string, title: string): void => {
        const parent = items.find((item) => item.id === parentId)
        if (!parent) return

        void createWorkItem({
            listId: activeListId,
            parentId,
            title,
            description: '',
            status: parent.status,
            priority: parent.priority,
            assignee: parent.assignee,
            dueDate: parent.dueDate
        })
            .then((subtask) => {
                setItems((current) => [...current, subtask])
                setPageNotice('Subtask added.')
                setPageError('')
            })
            .catch((error: unknown) => {
                setPageError(error instanceof Error ? error.message : 'Could not add subtask.')
            })
    }

    const updateItem = (itemId: string, changes: Partial<WorkItem>): void => {
        const previous = items.find((item) => item.id === itemId)
        if (!previous) return

        const revision = (itemUpdateRevisions.current.get(itemId) ?? 0) + 1
        itemUpdateRevisions.current.set(itemId, revision)
        setItems((current) => current.map((item) => (item.id === itemId ? { ...item, ...changes } : item)))
        setPageError('')
        setPageNotice('')
        void updateWorkItem(itemId, changes, previous.updatedAt)
            .then((updated) => {
                if (itemUpdateRevisions.current.get(itemId) !== revision) return
                setItems((current) =>
                    changes.listId && changes.listId !== activeListId
                        ? current.filter((item) => item.id !== itemId)
                        : current.map((item) => (item.id === itemId ? updated : item))
                )
            })
            .catch((error: unknown) => {
                if (itemUpdateRevisions.current.get(itemId) !== revision) return
                setItems((current) => current.map((item) => (item.id === itemId ? previous : item)))
                const details = error instanceof Error ? error.message : 'Please try again.'
                setPageError(`Could not save the change. The task was restored. ${details}`)
            })
    }

    const deleteItem = (itemId: string): void => {
        const item = items.find((candidate) => candidate.id === itemId)
        if (!window.confirm(`Delete “${item?.title ?? 'this task'}”? This cannot be undone.`)) return

        void deleteWorkItem(itemId)
            .then(() => {
                setItems((current) => current.filter((candidate) => candidate.id !== itemId))
                setPageError('')
                setPageNotice('Task deleted.')
            })
            .catch((error: unknown) => {
                setPageError(error instanceof Error ? error.message : 'Could not delete task.')
            })
    }

    const duplicateItem = (itemId: string): void => {
        void duplicateWorkItem(itemId)
            .then((item) => {
                setItems((current) => [item, ...current])
                setPageNotice('Task duplicated.')
                setPageError('')
            })
            .catch((error: unknown) => setPageError(error instanceof Error ? error.message : 'Could not duplicate task.'))
    }

    const toggleArchived = (itemId: string, archived: boolean): void => {
        void setWorkItemArchived(itemId, archived)
            .then(() => {
                setItems((current) => current.filter((item) => item.id !== itemId))
                setPageNotice(archived ? 'Task archived.' : 'Task restored.')
                setPageError('')
            })
            .catch((error: unknown) => setPageError(error instanceof Error ? error.message : 'Could not update task archive.'))
    }

    return { createItem, createSubtask, updateItem, deleteItem, duplicateItem, toggleArchived } as const
}
