'use client'

import { useRef, useState, type ChangeEvent, type ReactElement } from 'react'
import { Database, Download, FileUp } from 'lucide-react'
import { Button } from '@workspace/ui/primitives'
import { createWorkItem, fetchWorkItemPage, updateWorkItem } from '../api'
import type { WorkItemListQuery } from '../api'
import type { WorkItem } from '../model'
import type { useWorklistPageState } from '../use-worklist-page-state'
import { downloadWorkItemsBackup, downloadWorkItemsCsv, parseWorkItemsBackup, parseWorkItemsCsv } from '../work-item-export'

type Props = Readonly<{ state: ReturnType<typeof useWorklistPageState> }>

const fetchAllPages = async (query: WorkItemListQuery): Promise<readonly WorkItem[]> => {
    const items: WorkItem[] = []
    let cursor: string | undefined
    for (let pageNumber = 0; pageNumber < 200; pageNumber += 1) {
        const page = await fetchWorkItemPage(query, cursor)
        items.push(...page.items)
        if (!page.nextCursor) return items
        cursor = page.nextCursor
    }
    throw new Error('Export stopped after 10,000 tasks. Narrow the list or filters and retry.')
}

const mapWithConcurrency = async <T, R>(items: readonly T[], concurrency: number, work: (item: T) => Promise<R>): Promise<readonly R[]> => {
    const results = new Array<R>(items.length)
    let cursor = 0
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
        while (cursor < items.length) {
            const index = cursor++
            const item = items[index]
            if (item !== undefined) results[index] = await work(item)
        }
    }))
    return results
}

export const WorklistDataTools = ({ state }: Props): ReactElement => {
    const fileInput = useRef<HTMLInputElement>(null)
    const backupInput = useRef<HTMLInputElement>(null)
    const [busy, setBusy] = useState(false)
    const query: WorkItemListQuery = {
        listId: state.activeListId,
        search: state.debouncedSearch,
        status: state.statusFilter,
        sortField: state.sortField,
        sortDirection: state.sortDirection,
        filterLogic: state.filterLogic,
        filters: state.filters,
        includeArchived: state.includeArchivedItems
    }
    const exportCsv = async (): Promise<void> => {
        setBusy(true)
        try { downloadWorkItemsCsv(await fetchAllPages(query)); state.setPageError(''); state.setPageNotice('Filtered tasks exported as CSV.') }
        catch (error) { state.setPageError(error instanceof Error ? error.message : 'Could not export tasks.') }
        finally { setBusy(false) }
    }
    const backup = async (): Promise<void> => {
        setBusy(true)
        try {
            const items = await fetchAllPages({ ...query, search: '', status: 'All', filters: [], includeArchived: false })
            downloadWorkItemsBackup(items)
            state.setPageError(''); state.setPageNotice('Current list backup downloaded as JSON.')
        } catch (error) { state.setPageError(error instanceof Error ? error.message : 'Could not create a backup.') }
        finally { setBusy(false) }
    }
    const importCsv = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
        const file = event.currentTarget.files?.[0]
        event.currentTarget.value = ''
        if (!file) return
        setBusy(true)
        const created: WorkItem[] = []
        try {
            const rows = parseWorkItemsCsv(await file.text())
            for (const row of rows) created.push(await createWorkItem({ ...row, listId: state.activeListId }))
            state.setItems((current) => [...created, ...current])
            state.setPageError(''); state.setPageNotice(`${created.length} tasks imported into the current list.`)
        } catch (error) {
            if (created.length) state.setItems((current) => [...created, ...current])
            const reason = error instanceof Error ? error.message : 'Could not import this CSV. Check the file and retry.'
            state.setPageError(created.length ? `${created.length} tasks were imported before the import stopped. ${reason}` : reason)
        }
        finally { setBusy(false) }
    }
    const restoreBackup = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
        const file = event.currentTarget.files?.[0]
        event.currentTarget.value = ''
        if (!file) return
        setBusy(true)
        const created: WorkItem[] = []
        try {
            if (file.size > 10 * 1024 * 1024) throw new Error('Backup files must be smaller than 10 MB.')
            const items = parseWorkItemsBackup(await file.text())
            const list = state.lists.find((candidate) => candidate.id === state.activeListId)
            if (!list) throw new Error('Choose a destination list before restoring the backup.')
            if (!window.confirm(`Restore ${items.length} tasks into “${list.name}”? This creates copies and does not replace existing tasks.`)) return
            const allowedStatuses = list.settings.statuses
            const creations = await mapWithConcurrency(items, 5, async (source) => {
                try {
                    const item = await createWorkItem({
                        listId: list.id, title: source.title, description: source.description, status: allowedStatuses.includes(source.status) ? source.status : (allowedStatuses[0] ?? 'To do'),
                        priority: source.priority, assignee: source.assignee || 'Unassigned', ...(source.startDate ? { startDate: source.startDate } : {}), dueDate: source.dueDate,
                        checklist: source.checklist ?? [], dependsOn: [], recurrence: source.recurrence ?? null, tags: source.tags ?? [],
                        clientRequest: source.clientRequest ?? null, timeSpentMinutes: source.timeSpentMinutes ?? 0
                    })
                    created.push(item)
                    return { source, item, error: '' }
                } catch (error) { return { source, item: null, error: error instanceof Error ? error.message : 'Task could not be restored.' } }
            })
            const idMap = new Map(creations.flatMap((entry) => entry.item ? [[entry.source.id, entry.item.id] as const] : []))
            const relations = await mapWithConcurrency(creations.filter((entry) => entry.item), 5, async (entry) => {
                const item = entry.item
                if (!item) return null
                const parentId = entry.source.parentId ? idMap.get(entry.source.parentId) : undefined
                const dependsOn = entry.source.dependsOn?.flatMap((id) => idMap.get(id) ?? []) ?? []
                if (!parentId && dependsOn.length === 0) return null
                try { return await updateWorkItem(item.id, { ...(parentId ? { parentId } : {}), dependsOn }, item.updatedAt) }
                catch (error) { return error instanceof Error ? error.message : 'Task relationships could not be restored.' }
            })
            const relationErrors = relations.filter((result): result is string => typeof result === 'string')
            const restoredById = new Map(relations.filter((result): result is WorkItem => Boolean(result) && typeof result !== 'string').map((item) => [item.id, item]))
            const restoredItems = created.map((item) => restoredById.get(item.id) ?? item)
            state.setItems((current) => [...restoredItems, ...current])
            const failed = creations.filter((entry) => !entry.item).length + relationErrors.length
            if (failed) throw new Error(`${created.length} of ${items.length} tasks were restored; ${failed} task or relationship updates failed. ${creations.find((entry) => entry.error)?.error ?? relationErrors[0] ?? ''}`)
            state.setPageError(''); state.setPageNotice(`${created.length} tasks restored into “${list.name}”.`)
        } catch (error) {
            if (created.length) state.setItems((current) => created.reduce((itemsSoFar, item) => itemsSoFar.some((existing) => existing.id === item.id) ? itemsSoFar : [item, ...itemsSoFar], current))
            state.setPageError(error instanceof Error ? error.message : 'Could not restore this backup.')
        } finally { setBusy(false) }
    }

    return <div className="flex flex-wrap items-center justify-end gap-2 border-b border-[#e8ede6] bg-[#fbfcfa] px-3 py-2">
        <input accept=".csv,text/csv" className="sr-only" onChange={(event) => void importCsv(event)} ref={fileInput} type="file" />
        <input accept=".json,application/json" className="sr-only" onChange={(event) => void restoreBackup(event)} ref={backupInput} type="file" />
        <Button className="h-8 gap-1.5 rounded-md border-[#dce4da] bg-white px-2.5 text-xs font-medium text-[#526b58] shadow-none" disabled={busy || !state.activeListId} onClick={() => fileInput.current?.click()} variant="outline"><FileUp aria-hidden="true" className="size-3.5" />Import CSV</Button>
        <Button className="h-8 gap-1.5 rounded-md border-[#dce4da] bg-white px-2.5 text-xs font-medium text-[#526b58] shadow-none" disabled={busy || !state.activeListId} onClick={() => backupInput.current?.click()} variant="outline"><Database aria-hidden="true" className="size-3.5" />Restore backup</Button>
        <Button className="h-8 gap-1.5 rounded-md border-[#dce4da] bg-white px-2.5 text-xs font-medium text-[#526b58] shadow-none" disabled={busy || !state.activeListId} onClick={() => void exportCsv()} variant="outline"><Download aria-hidden="true" className="size-3.5" />Export filtered CSV</Button>
        <Button className="h-8 gap-1.5 rounded-md border-[#dce4da] bg-white px-2.5 text-xs font-medium text-[#526b58] shadow-none" disabled={busy || !state.activeListId} onClick={() => void backup()} variant="outline"><Database aria-hidden="true" className="size-3.5" />Download list backup</Button>
    </div>
}
