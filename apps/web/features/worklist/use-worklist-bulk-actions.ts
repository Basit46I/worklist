import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { deleteWorkItems, fetchWorkItemPage, updateWorkItems } from './api'
import type { WorkItemListQuery, WorklistList, WorklistUser } from './api'
import type { WorkItem, WorkItemPriority, WorkItemStatus } from './model'
import { formatDate, maxBulkSelection } from '@workspace/worklist-ui'

type Setter<T> = Dispatch<SetStateAction<T>>
type BulkOperationDetail = Readonly<{ itemId: string; title: string; outcome: string }>
const noSelectedItems: ReadonlySet<string> = new Set()

type WorklistBulkActionsOptions = Readonly<{
    items: readonly WorkItem[]
    setItems: Setter<readonly WorkItem[]>
    visibleSelectedIds: ReadonlySet<string>
    setSelectedIds: Setter<ReadonlySet<string>>
    selectionListKey: string
    setSelectionListKey: Setter<string>
    currentListKey: string
    activeListId: string
    lists: readonly WorklistList[]
    bulkStatus: WorkItemStatus
    bulkPriority: WorkItemPriority
    bulkAssignee: string
    bulkDueDate: string
    bulkListId: string
    listQuery: WorkItemListQuery
    user: WorklistUser | null
    nextCursor: string | null
    loadingMoreItems: boolean
    isListLoaded: boolean
    listRequestId: MutableRefObject<number>
    setNextCursor: Setter<string | null>
    setLoadingMoreListKey: Setter<string>
    setBulkResults: Setter<readonly BulkOperationDetail[]>
    setPageError: Setter<string>
    setPageNotice: Setter<string>
}>

export const useWorklistBulkActions = ({
    items,
    setItems,
    visibleSelectedIds,
    setSelectedIds,
    selectionListKey,
    setSelectionListKey,
    currentListKey,
    activeListId,
    lists,
    bulkStatus,
    bulkPriority,
    bulkAssignee,
    bulkDueDate,
    bulkListId,
    listQuery,
    user,
    nextCursor,
    loadingMoreItems,
    isListLoaded,
    listRequestId,
    setNextCursor,
    setLoadingMoreListKey,
    setBulkResults,
    setPageError,
    setPageNotice
}: WorklistBulkActionsOptions) => {
    const toggleSelected = (itemId: string, checked: boolean): void => {
        if (checked && !visibleSelectedIds.has(itemId) && visibleSelectedIds.size >= maxBulkSelection) {
            setPageNotice(`Bulk actions are limited to ${maxBulkSelection} selected tasks at a time.`)
            return
        }
        setSelectionListKey(currentListKey)
        setSelectedIds((current) => {
            const next = new Set(selectionListKey === currentListKey ? current : noSelectedItems)
            if (checked) next.add(itemId)
            else next.delete(itemId)
            return next
        })
    }

    const selectLoadedItems = (itemIds: readonly string[], checked: boolean): void => {
        setSelectionListKey(currentListKey)
        setSelectedIds((current) => {
            const next = new Set(selectionListKey === currentListKey ? current : noSelectedItems)
            if (checked) {
                next.clear()
                itemIds.slice(0, maxBulkSelection).forEach((itemId) => next.add(itemId))
            } else {
                itemIds.forEach((itemId) => next.delete(itemId))
            }
            return next
        })
        if (checked && itemIds.length > maxBulkSelection) {
            setPageNotice(`Selected the first ${maxBulkSelection} loaded tasks. Bulk actions are limited to ${maxBulkSelection} at a time.`)
        }
    }

    const applyBulkUpdate = (changes: Parameters<typeof updateWorkItems>[1], describe: () => string): void => {
        const ids = [...visibleSelectedIds]
        setBulkResults([])
        const titles = new Map(items.map((item) => [item.id, item.title]))
        void updateWorkItems(ids, changes)
            .then(({ appliedCount, results }) => {
                const appliedIds = new Set(results.filter((result) => result.outcome === 'applied').map((result) => result.itemId))
                const unavailableIds = new Set(results.filter((result) => result.outcome === 'not_found').map((result) => result.itemId))
                const failedIds = new Set(results.filter((result) => result.outcome === 'failed').map((result) => result.itemId))
                setItems((current) =>
                    current
                        .filter(
                            (item) => !unavailableIds.has(item.id) && !(changes.listId && changes.listId !== activeListId && appliedIds.has(item.id))
                        )
                        .map((item) => (appliedIds.has(item.id) ? { ...item, ...changes } : item))
                )
                setSelectedIds((current) =>
                    selectionListKey === currentListKey ? new Set([...current].filter((itemId) => failedIds.has(itemId))) : current
                )
                setBulkResults(
                    results.map((result) => ({
                        itemId: result.itemId,
                        title: titles.get(result.itemId) ?? `Task ${result.itemId}`,
                        outcome:
                            result.outcome === 'applied'
                                ? describe()
                                : result.outcome === 'not_found'
                                  ? 'No longer available in this team'
                                  : 'Failed; still selected for retry'
                    }))
                )
                setPageError('')
                const notFoundCount = results.filter((result) => result.outcome === 'not_found').length
                const failedCount = results.filter((result) => result.outcome === 'failed').length
                setPageNotice(
                    `${appliedCount} applied${notFoundCount ? `; ${notFoundCount} no longer available` : ''}${failedCount ? `; ${failedCount} failed and remain selected` : ''}.`
                )
            })
            .catch((error: unknown) => {
                setPageError(error instanceof Error ? error.message : 'Could not update selected tasks.')
            })
    }

    const deleteSelected = (): void => {
        const ids = [...visibleSelectedIds]
        if (!window.confirm(`Delete ${ids.length} selected task${ids.length === 1 ? '' : 's'}? This cannot be undone.`)) return
        setBulkResults([])
        const titles = new Map(items.map((item) => [item.id, item.title]))
        void deleteWorkItems(ids)
            .then(({ deletedCount, results }) => {
                const resolvedIds = new Set(results.filter((result) => result.outcome !== 'failed').map((result) => result.itemId))
                const failedIds = new Set(results.filter((result) => result.outcome === 'failed').map((result) => result.itemId))
                setItems((current) => current.filter((item) => !resolvedIds.has(item.id)))
                setSelectedIds((current) =>
                    selectionListKey === currentListKey ? new Set([...current].filter((itemId) => failedIds.has(itemId))) : current
                )
                setBulkResults(
                    results.map((result) => ({
                        itemId: result.itemId,
                        title: titles.get(result.itemId) ?? `Task ${result.itemId}`,
                        outcome:
                            result.outcome === 'deleted'
                                ? 'Deleted'
                                : result.outcome === 'not_found'
                                  ? 'No longer available in this team'
                                  : 'Failed; still selected for retry'
                    }))
                )
                setPageError('')
                const notFoundCount = results.filter((result) => result.outcome === 'not_found').length
                const failedCount = results.filter((result) => result.outcome === 'failed').length
                setPageNotice(
                    `${deletedCount} deleted${notFoundCount ? `; ${notFoundCount} no longer available` : ''}${failedCount ? `; ${failedCount} failed and remain selected` : ''}.`
                )
            })
            .catch((error: unknown) => {
                setPageError(error instanceof Error ? error.message : 'Could not delete selected tasks.')
            })
    }

    const updateSelectedStatus = (): void => applyBulkUpdate({ status: bulkStatus }, () => `Status set to ${bulkStatus}`)
    const updateSelectedPriority = (): void => applyBulkUpdate({ priority: bulkPriority }, () => `Priority set to ${bulkPriority}`)
    const updateSelectedStatusTo = (status: string): void => applyBulkUpdate({ status }, () => `Status set to ${status}`)
    const updateSelectedPriorityTo = (priority: WorkItemPriority): void => applyBulkUpdate({ priority }, () => `Priority set to ${priority}`)
    const updateSelectedAssigneeTo = (assigneeValue: string): void => {
        const assignee = assigneeValue.trim() || 'Unassigned'
        applyBulkUpdate({ assignee }, () => `Assigned to ${assignee}`)
    }
    const updateSelectedDueDateTo = (dueDate: string): void => applyBulkUpdate({ dueDate }, () => `Due date set to ${formatDate(dueDate)}`)
    const updateSelectedAssignee = (): void => {
        const assignee = bulkAssignee.trim() || 'Unassigned'
        applyBulkUpdate({ assignee }, () => `Assigned to ${assignee}`)
    }
    const updateSelectedDueDate = (): void => applyBulkUpdate({ dueDate: bulkDueDate }, () => `Due date set to ${formatDate(bulkDueDate)}`)
    const moveSelectedToList = (): void => {
        if (bulkListId && bulkListId !== activeListId) {
            applyBulkUpdate({ listId: bulkListId }, () => `Moved to ${lists.find((list) => list.id === bulkListId)?.name ?? 'another list'}`)
        }
    }
    const moveSelectedToListId = (listId: string): void => {
        if (listId && listId !== activeListId) applyBulkUpdate({ listId }, () => `Moved to ${lists.find((list) => list.id === listId)?.name ?? 'another list'}`)
    }

    const loadMoreItems = (): void => {
        if (!user || !nextCursor || loadingMoreItems || !isListLoaded) return
        const requestId = listRequestId.current
        setLoadingMoreListKey(currentListKey)
        void fetchWorkItemPage(listQuery, nextCursor)
            .then((page) => {
                if (requestId !== listRequestId.current) return
                setItems((current) => {
                    const existingIds = new Set(current.map((item) => item.id))
                    return [...current, ...page.items.filter((item) => !existingIds.has(item.id))]
                })
                setNextCursor(page.nextCursor)
            })
            .catch((error: unknown) => {
                if (requestId === listRequestId.current) setPageError(error instanceof Error ? error.message : 'Could not load more tasks.')
            })
            .finally(() => {
                if (requestId === listRequestId.current) setLoadingMoreListKey('')
            })
    }

    return {
        toggleSelected,
        selectLoadedItems,
        deleteSelected,
        updateSelectedStatus,
        updateSelectedStatusTo,
        updateSelectedPriority,
        updateSelectedPriorityTo,
        updateSelectedAssignee,
        updateSelectedAssigneeTo,
        updateSelectedDueDate,
        updateSelectedDueDateTo,
        moveSelectedToList,
        moveSelectedToListId,
        loadMoreItems
    } as const
}
