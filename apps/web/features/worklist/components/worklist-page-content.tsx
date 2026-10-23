"use client";

import { useCallback, type ReactElement } from "react";
import { CalendarDays, Columns3, ListTodo, PanelsTopLeft, Plus, UsersRound } from "lucide-react";
import { Button } from "@workspace/ui/primitives";
import { WorklistControls } from "@workspace/worklist-ui";
import type { WorklistGroup } from "@workspace/worklist-ui";
import type { WorklistList } from "../api";
import { useWorklistPageState } from "../use-worklist-page-state";
import type { useWorklistListActions } from "../use-worklist-list-actions";
import type { useWorklistTemplateActions } from "../use-worklist-template-actions";
import type { useWorklistSavedViews } from "../use-worklist-saved-views";
import type { useWorklistViewActions } from "../use-worklist-view-actions";
import type { useWorklistItemActions } from "../use-worklist-item-actions";
import type { useWorklistBulkActions } from "../use-worklist-bulk-actions";
import type { useWorklistTeamActions } from "../use-worklist-team-actions";
import { ApplicationShell } from "./application-shell";
import { WorklistBulkActionsBar } from "./worklist-bulk-actions-bar";
import { WorklistFeedbackPanels } from "./worklist-feedback-panels";
import { WorklistListWorkspace } from "./worklist-list-workspace";
import { WorklistResultsPanel } from "./worklist-results-panel";
import { WorklistTaskComposer } from "./worklist-task-composer";
import { WorklistTeamPanel } from "./worklist-team-panel";
import { WorklistViewOptionsPanel } from "./worklist-view-options-panel";
import { useWorklistKeyboardShortcuts } from "../use-worklist-keyboard-shortcuts";

type PageState = ReturnType<typeof useWorklistPageState>;
type PageActions = Readonly<{
    lists: ReturnType<typeof useWorklistListActions>;
    templates: ReturnType<typeof useWorklistTemplateActions>;
    savedViews: ReturnType<typeof useWorklistSavedViews>;
    views: ReturnType<typeof useWorklistViewActions>;
    items: ReturnType<typeof useWorklistItemActions>;
    bulk: ReturnType<typeof useWorklistBulkActions>;
    team: ReturnType<typeof useWorklistTeamActions>;
}>;
type PageData = Readonly<{
    activeList: WorklistList | undefined;
    activeStatuses: readonly string[];
    filteredItems: PageState["items"];
    groups: readonly WorklistGroup[];
    listSavedViews: PageState["savedViews"];
    isListLoaded: boolean;
    itemsLoading: boolean;
    loadingMoreItems: boolean;
    visibleSelectedIds: ReadonlySet<string>;
}>;
type WorklistPageContentProps = Readonly<{
    state: PageState;
    actions: PageActions;
    data: PageData;
    onSignOut: () => void;
}>;
export const WorklistPageContent = ({
    state,
    actions,
    data,
    onSignOut,
}: WorklistPageContentProps): ReactElement | null => {
    const { user, signOutBusy, setShowInviteForm, activeSavedViewId, search, setSearch, filters, setFilters, filterLogic, setFilterLogic, showFilterBuilder, setShowFilterBuilder, statusFilter, setStatusFilter, viewMode, setViewMode, groupBy, setGroupBy, sortField, sortDirection, visibleColumns, showColumnPicker, setShowColumnPicker, setShowNewItem } = state
    const openNewTask = useCallback(() => setShowNewItem(true), [setShowNewItem]);
    useWorklistKeyboardShortcuts(openNewTask);
    if (!user) return null

    const { lists: listActions, templates: templateActions, savedViews: savedViewActions, views: viewActions, items: itemActions, bulk: bulkActions, team: teamActions } = actions
    const { activeList, activeStatuses, listSavedViews, visibleSelectedIds } = data
    const { createItem } = itemActions
    const { addFilter, updateFilter, toggleColumn } = viewActions
    const { openTeamMembers } = teamActions
    const openTemplates = (): void => { state.setTemplateId((current) => current || state.templates[0]?.id || ""); state.setShowTemplatePicker(true); state.setShowTemplateBuilder(false) }
    const createList = (): void => { state.setListNameDraft(''); state.setShowListForm(true) }
    return (
        <ApplicationShell
            activeRoute={viewMode === 'board' ? 'board' : viewMode === 'calendar' ? 'calendar' : 'worklist'}
            onSignOut={onSignOut}
            signOutBusy={signOutBusy}
            user={user}
            {...(activeList ? { projectContext: { spaceName: activeList.spaceName, ...(activeList.folderName ? { folderName: activeList.folderName } : {}), listName: activeList.name } } : {})}
        >
            <div className="mx-auto max-w-[1500px] px-5 pb-16 pt-7 sm:px-8 sm:pt-8">
                <div className="mb-7 flex flex-col justify-between gap-5 border-b border-[#e5eae3] pb-6 sm:flex-row sm:items-end">
                    <div className="min-w-0">
                        <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.12em] text-[#718076]">
                            <span>{activeList?.spaceName ?? 'General'} workspace</span><span aria-hidden="true" className="text-[#b7c0b8]">/</span><span>{activeList?.folderName || 'Lists'}</span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf1e8] px-2 py-1 text-[9px] font-medium normal-case tracking-normal text-[#516c59]"><span className="size-1.5 rounded-full bg-[#729276]" />{activeList?.archivedAt ? 'Archived' : 'Active'}</span>
                        </p>
                        <div className="flex items-center gap-2">
                            <h1 className="truncate font-serif text-[32px] font-normal leading-tight tracking-[-.025em] text-[#243d32] sm:text-[38px]">{activeList?.name ?? 'Your work'}</h1>
                            <WorklistListWorkspace activeList={activeList} listActions={listActions} state={state} templateActions={templateActions} user={user} />
                        </div>
                        <p className="mt-2 max-w-2xl text-[13px] leading-5 text-[#76847a]">
                            {activeList?.description || `Plan work, track progress, and keep ${user.teamName} aligned.`}
                        </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {user.role === "owner" && <>
                            <Button className="h-10 rounded-lg border-[#dce5dd] bg-white px-3 text-[13px] text-[#355345] shadow-none hover:bg-[#f5f8f5]" onClick={() => setShowInviteForm((shown) => !shown)} variant="outline"><UsersRound aria-hidden="true" className="size-4" />Invite</Button>
                        </>}
                        {user.role !== "viewer" && (
                            <Button
                                className="h-10 rounded-lg bg-[#245d43] px-4 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[#174638] focus-visible:ring-2 focus-visible:ring-[#79a18a]"
                                onClick={() => setShowNewItem((shown) => !shown)}
                                title="Keyboard shortcut: N"
                            >
                                <Plus aria-hidden="true" className="size-4" /> Add task
                            </Button>
                        )}
                    </div>
                </div>

                <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <label className="flex h-9 min-w-44 max-w-sm items-center gap-2 rounded-lg border border-[#e6ebe4] bg-white px-3 text-[11px] font-medium text-[#78857d]">
                        <span>List</span>
                        <select aria-label="Choose list" className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-[#30473a] outline-none" onChange={(event) => { const selected = state.lists.find((list) => list.id === event.target.value); if (selected) listActions.selectList(selected) }} value={state.activeListId}>
                            {state.lists.filter((list) => !list.archivedAt).map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
                        </select>
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                        {user.role !== 'viewer' && <Button className="h-9 rounded-lg border-[#dce5dd] bg-white px-3 text-xs text-[#355345] shadow-none hover:bg-[#f5f8f5]" onClick={openTemplates} variant="outline"><PanelsTopLeft aria-hidden="true" className="size-3.5" />Templates</Button>}
                        {user.role === 'owner' && <Button className="h-9 rounded-lg border-[#dce5dd] bg-white px-3 text-xs text-[#355345] shadow-none hover:bg-[#f5f8f5]" onClick={openTeamMembers} variant="outline"><UsersRound aria-hidden="true" className="size-3.5" />Manage team</Button>}
                        {user.role !== 'viewer' && <Button className="h-9 rounded-lg bg-[#edf3eb] px-3 text-xs font-medium text-[#355345] shadow-none hover:bg-[#e3ece1]" onClick={createList}><Plus aria-hidden="true" className="size-3.5" />New list</Button>}
                    </div>
                </div>

                <WorklistTeamPanel actions={teamActions} state={state} />

                <WorklistTaskComposer
                    activeStatuses={activeStatuses}
                    createItem={createItem}
                    state={state}
                    user={user}
                />
                <WorklistFeedbackPanels savedViewActions={savedViewActions} state={state} />

                <nav aria-label="Worklist views" className="flex items-center gap-6 border-b border-[#dfe5df]">
                    <button aria-current={viewMode === 'list' ? 'page' : undefined} className={`relative inline-flex h-10 items-center gap-2 text-[13px] ${viewMode === 'list' ? 'font-semibold text-[#234b38]' : 'text-[#78857d] hover:text-[#334b3c]'}`} onClick={() => setViewMode('list')} type="button"><ListTodo aria-hidden="true" className="size-4" />List{viewMode === 'list' && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[#3c7154]" />}</button>
                    <button aria-current={viewMode === 'board' ? 'page' : undefined} className={`relative inline-flex h-10 items-center gap-2 text-[13px] ${viewMode === 'board' ? 'font-semibold text-[#234b38]' : 'text-[#78857d] hover:text-[#334b3c]'}`} onClick={() => setViewMode('board')} type="button"><Columns3 aria-hidden="true" className="size-4" />Board{viewMode === 'board' && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[#3c7154]" />}</button>
                    <button aria-current={viewMode === 'calendar' ? 'page' : undefined} className={`relative inline-flex h-10 items-center gap-2 text-[13px] ${viewMode === 'calendar' ? 'font-semibold text-[#234b38]' : 'text-[#78857d] hover:text-[#334b3c]'}`} onClick={() => setViewMode('calendar')} type="button"><CalendarDays aria-hidden="true" className="size-4" />Calendar{viewMode === 'calendar' && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[#3c7154]" />}</button>
                    <span className="ml-auto pb-2 text-xs text-[#849188]">{data.filteredItems.length} tasks in this view</span>
                </nav>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 pt-3 text-[10px] font-medium uppercase tracking-[.08em] text-[#718076]">
                    <p>List scope · {activeList?.name ?? 'All lists'} · {data.filteredItems.filter((item) => !item.parentId).length} top-level tasks</p>
                    <p className="normal-case tracking-normal text-[#849188]">As of {new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date())}</p>
                </div>
                <div className="mb-3 border-b border-[#e5eae3] pb-4">
                <WorklistControls
                    search={search}
                    onSearchChange={setSearch}
                    statusFilter={statusFilter}
                    onStatusFilterChange={setStatusFilter}
                    activeStatuses={activeStatuses}
                    filters={filters}
                    filterLogic={filterLogic}
                    onFilterLogicChange={setFilterLogic}
                    filterBuilderOpen={showFilterBuilder}
                    onFilterBuilderToggle={() => setShowFilterBuilder((shown) => !shown)}
                    onClearFilters={() => {
                        setSearch("");
                        setStatusFilter("All");
                        setFilters([]);
                        setFilterLogic("AND");
                    }}
                    onAddFilter={addFilter}
                    onUpdateFilter={updateFilter}
                    onRemoveFilter={(index) =>
                        setFilters((current) =>
                            current.filter((_rule, ruleIndex) => ruleIndex !== index),
                        )
                    }
                    savedViews={listSavedViews}
                    activeSavedViewId={activeSavedViewId}
                    onSavedViewChange={savedViewActions.selectSavedView}
                    onSaveView={savedViewActions.saveCurrentView}
                    onUpdateSavedView={savedViewActions.updateActiveSavedView}
                    onToggleSavedViewVisibility={
                        savedViewActions.toggleSavedViewVisibility
                    }
                    onDeleteSavedView={savedViewActions.deleteActiveSavedView}
                    viewMode={viewMode}
                    showColumnPicker={showColumnPicker}
                    onColumnPickerToggle={() => setShowColumnPicker((shown) => !shown)}
                    visibleColumns={visibleColumns}
                    onToggleColumn={toggleColumn}
                    groupBy={groupBy}
                    onGroupByChange={setGroupBy}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSortChange={viewActions.handleSort}
                />
                </div>
                <div className={`grid items-start gap-4 ${showColumnPicker && viewMode === 'list' ? 'xl:grid-cols-[minmax(0,1fr)_238px]' : ''}`}>
                    <div className="min-w-0">
                        <WorklistBulkActionsBar
                            actions={bulkActions}
                            activeStatuses={activeStatuses}
                            state={state}
                            visibleSelectedIds={visibleSelectedIds}
                        />
                        <WorklistResultsPanel
                            actions={actions}
                            data={data}
                            state={state}
                            user={user}
                        />
                    </div>
                    {showColumnPicker && viewMode === 'list' && <div className="xl:sticky xl:top-24">
                        <WorklistViewOptionsPanel
                            activeSavedViewId={activeSavedViewId}
                            savedViews={listSavedViews}
                            visibleColumns={visibleColumns}
                            onClose={() => setShowColumnPicker(false)}
                            onSelectSavedView={savedViewActions.selectSavedView}
                            onSaveView={savedViewActions.saveCurrentView}
                            onToggleColumn={toggleColumn}
                            onReorderColumns={viewActions.reorderColumns}
                            onUpdateSavedView={savedViewActions.updateActiveSavedView}
                            onToggleSavedViewVisibility={savedViewActions.toggleSavedViewVisibility}
                            onDeleteSavedView={savedViewActions.deleteActiveSavedView}
                        />
                    </div>}
                </div>
            </div>
        </ApplicationShell>
    );
};
