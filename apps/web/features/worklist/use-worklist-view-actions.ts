import type { Dispatch, SetStateAction } from 'react'
import type { WorklistList } from './api'
import type { WorkItemColumn, WorkItemFilter, WorkItemSortField } from './model'

type Setter<T> = Dispatch<SetStateAction<T>>

type WorklistViewActionsOptions = Readonly<{
    sortField: WorkItemSortField
    setSortField: Setter<WorkItemSortField>
    setSortDirection: Setter<'asc' | 'desc'>
    setVisibleColumns: Setter<readonly WorkItemColumn[]>
    setColumnWidths: Setter<WorklistList['settings']['columnWidths']>
    setFilters: Setter<readonly WorkItemFilter[]>
    firstStatus?: string | undefined
}>

export const useWorklistViewActions = ({
    sortField,
    setSortField,
    setSortDirection,
    setVisibleColumns,
    setColumnWidths,
    setFilters,
    firstStatus
}: WorklistViewActionsOptions) => {
    const handleSort = (field: WorkItemSortField): void => {
        if (field === sortField) {
            setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
            return
        }
        setSortField(field)
        setSortDirection('asc')
    }

    const toggleColumn = (column: WorkItemColumn): void => {
        setVisibleColumns((current) => (current.includes(column) ? current.filter((item) => item !== column) : [...current, column]))
    }

    const reorderColumns = (source: WorkItemColumn, target: WorkItemColumn): void => {
        if (source === target) return
        setVisibleColumns((current) => {
            const next = [...current]
            const sourceIndex = next.indexOf(source)
            const targetIndex = next.indexOf(target)
            if (sourceIndex < 0 || targetIndex < 0) return current
            next.splice(sourceIndex, 1)
            next.splice(targetIndex, 0, source)
            return next
        })
    }

    const resizeColumn = (column: WorkItemColumn, width: number): void => {
        setColumnWidths((current) => ({ ...current, [column]: width }))
    }

    const addFilter = (): void => {
        setFilters((current) => [...current, { field: 'status', operator: 'equals', value: firstStatus ?? 'To do' }])
    }

    const updateFilter = (index: number, changes: Partial<WorkItemFilter>): void => {
        setFilters((current) => current.map((filter, filterIndex) => (filterIndex === index ? { ...filter, ...changes } : filter)))
    }

    return { handleSort, toggleColumn, reorderColumns, resizeColumn, addFilter, updateFilter } as const
}
