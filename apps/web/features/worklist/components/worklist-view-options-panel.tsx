'use client'

import type { ReactElement } from 'react'
import { Check, GripVertical, LockKeyhole, Plus, Users, X } from 'lucide-react'
import { Button, Checkbox } from '@workspace/ui/primitives'
import type { SavedViewOption, WorkItemColumn } from '@workspace/worklist-ui'
import { columnLabels } from '@workspace/worklist-ui'

type WorklistViewOptionsPanelProps = Readonly<{
    activeSavedViewId: string
    savedViews: readonly SavedViewOption[]
    visibleColumns: readonly WorkItemColumn[]
    onClose: () => void
    onSelectSavedView: (id: string) => void
    onSaveView: () => void
    onToggleColumn: (column: WorkItemColumn) => void
    onReorderColumns: (source: WorkItemColumn, target: WorkItemColumn) => void
    onUpdateSavedView: () => void
    onToggleSavedViewVisibility: () => void
    onDeleteSavedView: () => void
}>

export const WorklistViewOptionsPanel = ({
    activeSavedViewId,
    savedViews,
    visibleColumns,
    onClose,
    onSelectSavedView,
    onSaveView,
    onToggleColumn,
    onReorderColumns,
    onUpdateSavedView,
    onToggleSavedViewVisibility,
    onDeleteSavedView,
}: WorklistViewOptionsPanelProps): ReactElement => {
    const activeView = savedViews.find((view) => view.id === activeSavedViewId)

    return (
        <aside aria-label="View options" className="h-fit rounded-xl border border-[#dce4da] bg-white p-4">
            <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-semibold text-[#233a2f]">View options</h3>
                <button aria-label="Close view options" className="grid size-7 place-items-center rounded-md text-[#829087] hover:bg-[#f2f5f2] hover:text-[#34483b]" onClick={onClose} type="button"><X aria-hidden="true" className="size-4" /></button>
            </div>

            <section className="mt-5" aria-labelledby="saved-views-heading">
                <h4 id="saved-views-heading" className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#7d8a81]">Saved views</h4>
                <div className="mt-2 grid gap-1">
                    <button aria-current={!activeSavedViewId ? 'true' : undefined} className={`flex min-h-9 items-center gap-2 rounded-md px-2.5 text-left text-xs ${!activeSavedViewId ? 'bg-[#e6efe1] font-medium text-[#1f4638]' : 'text-[#536258] hover:bg-[#f5f7f5]'}`} onClick={() => onSelectSavedView('')} type="button">{!activeSavedViewId && <Check aria-hidden="true" className="size-3.5" />}<span>All tasks</span></button>
                    {savedViews.map((view) => <button aria-current={activeSavedViewId === view.id ? 'true' : undefined} className={`flex min-h-9 items-center gap-2 rounded-md px-2.5 text-left text-xs ${activeSavedViewId === view.id ? 'bg-[#e6efe1] font-medium text-[#1f4638]' : 'text-[#536258] hover:bg-[#f5f7f5]'}`} key={view.id} onClick={() => onSelectSavedView(view.id)} type="button">{activeSavedViewId === view.id && <Check aria-hidden="true" className="size-3.5" />}<span className="min-w-0 flex-1 truncate">{view.name}</span>{view.visibility === 'team' ? <Users aria-label="Shared with team" className="size-3.5 text-[#829087]" /> : <LockKeyhole aria-label="Private view" className="size-3.5 text-[#829087]" />}</button>)}
                </div>
                <Button className="mt-2 h-9 w-full justify-start rounded-lg border-[#dfe7df] text-xs text-[#40584a] shadow-none" onClick={onSaveView} variant="outline"><Plus aria-hidden="true" className="size-3.5" />Save as new view</Button>
                {activeView && <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-[#edf0ed] pt-2">
                    <button className="text-[11px] text-[#68786e] hover:text-[#284d39] disabled:opacity-50" disabled={!activeView.canManage} onClick={onUpdateSavedView} type="button">Update</button>
                    <button className="text-[11px] text-[#68786e] hover:text-[#284d39] disabled:opacity-50" disabled={!activeView.canManage} onClick={onToggleSavedViewVisibility} type="button">{activeView.visibility === 'team' ? 'Make private' : 'Share with team'}</button>
                    <button className="text-[11px] text-rose-700 disabled:opacity-50" disabled={!activeView.canManage} onClick={onDeleteSavedView} type="button">Delete</button>
                </div>}
            </section>

            <section className="mt-5 border-t border-[#edf0ed] pt-4" aria-labelledby="visible-columns-heading">
                <h4 id="visible-columns-heading" className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#7d8a81]">Visible columns</h4>
                <div className="mt-2 grid gap-0.5">
                    <div className="flex min-h-8 items-center gap-2 rounded-md px-1 text-xs text-[#495a4f]"><GripVertical aria-hidden="true" className="size-3 text-[#c3cbc5]" /><Checkbox aria-label="Task name (required)" checked disabled />Task name · required</div>
                    {(['status', 'priority', 'assignee', 'dueDate'] as const).map((column) => <label className="flex min-h-8 cursor-grab items-center gap-2 rounded-md px-1 text-xs text-[#495a4f] hover:bg-[#f7f9f7]" draggable key={column} onDragOver={(event) => event.preventDefault()} onDragStart={(event) => event.dataTransfer.setData('text/worklist-column', column)} onDrop={(event) => { event.preventDefault(); const source = event.dataTransfer.getData('text/worklist-column') as WorkItemColumn; if (source) onReorderColumns(source, column) }}><GripVertical aria-hidden="true" className="size-3 text-[#a0aaa2]" /><Checkbox checked={visibleColumns.includes(column)} onCheckedChange={() => onToggleColumn(column)} />{columnLabels[column]}</label>)}
                </div>
                <p className="mt-2 text-[11px] leading-4 text-[#87938b]">Drag column handles to reorder.</p>
            </section>
        </aside>
    )
}
