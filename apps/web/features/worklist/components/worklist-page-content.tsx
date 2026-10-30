"use client";

import { useCallback, type ReactElement } from "react";
import { CalendarDays, ChevronDown, Columns3, ListTodo, MoreHorizontal, PanelsTopLeft, Plus, UsersRound } from "lucide-react";
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@workspace/ui/primitives";
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

const initials = (name: string): string => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();

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
    const members = [user, ...state.teamMembers.filter((member) => member.id !== user.id)].slice(0, 4)
    const memberStack = <span className="flex items-center -space-x-2">{members.map((member, index) => <span aria-hidden="true" className={`grid size-8 place-items-center rounded-full border-2 border-white text-[10px] font-semibold text-white ${index % 3 === 0 ? 'bg-[#55765e]' : index % 3 === 1 ? 'bg-[#879b7e]' : 'bg-[#777f72]'}`} key={member.id}>{initials(member.name)}</span>)}</span>
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
            <div className="worklist-page mx-auto max-w-[1500px] px-5 pb-16 pt-6 sm:px-8 sm:pt-7">
                <header className="mb-3 flex flex-col justify-between gap-4 pb-3 sm:flex-row sm:items-center">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2.5"><span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-lg bg-violet-500 text-lg font-semibold text-white">{initials(activeList?.name ?? "Tasks").slice(0, 1)}</span>
                            <label className="flex min-w-0 cursor-pointer items-center gap-1">
                                <span className="sr-only">Choose list</span>
                                <select aria-label="Choose list" className="max-w-full cursor-pointer appearance-none bg-transparent pr-7 text-[25px] font-semibold tracking-[-.04em] text-[#202923] outline-none sm:text-[29px]" onChange={(event) => { const selected = state.lists.find((list) => list.id === event.target.value); if (selected) listActions.selectList(selected) }} value={state.activeListId}>
                                    {state.lists.filter((list) => !list.archivedAt).map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
                                </select>
                                <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-[#69756d]" />
                            </label>
                            <WorklistListWorkspace activeList={activeList} listActions={listActions} state={state} templateActions={templateActions} user={user} />
                            {activeList?.archivedAt && <span className="rounded-full bg-[#f2f4f0] px-2 py-1 text-[10px] font-medium text-[#6c776f]">Archived</span>}
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                        {user.role === 'owner' ? <button aria-label="View team members" className="rounded-full p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#557a60]" onClick={openTeamMembers} type="button">{memberStack}</button> : <div aria-label="Workspace members">{memberStack}</div>}
                        {user.role === 'owner' && <Button className="h-9 rounded-lg border-[#dce2dd] bg-white px-3 text-[12px] font-medium text-[#35483b] shadow-none hover:bg-[#f7f8f6]" onClick={() => setShowInviteForm(true)} variant="outline"><UsersRound aria-hidden="true" className="size-3.5" />Invite</Button>}
                        {user.role !== 'viewer' && <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button aria-label="More workspace actions" className="size-9 rounded-lg border-[#dce2dd] bg-white p-0 text-[#58655b] shadow-none" variant="outline"><MoreHorizontal aria-hidden="true" className="size-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onSelect={openTemplates}><PanelsTopLeft aria-hidden="true" />Templates</DropdownMenuItem>
                                {user.role === 'owner' && <DropdownMenuItem onSelect={openTeamMembers}><UsersRound aria-hidden="true" />Manage team</DropdownMenuItem>}
                                <DropdownMenuItem onSelect={createList}><Plus aria-hidden="true" />New list</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>}
                    </div>
                </header>

                <WorklistTeamPanel actions={teamActions} state={state} />

                <WorklistTaskComposer
                    activeStatuses={activeStatuses}
                    createItem={createItem}
                    state={state}
                    user={user}
                />
                <WorklistFeedbackPanels savedViewActions={savedViewActions} state={state} />

                <section aria-label="Worklist views and actions" className="mb-3 flex flex-col justify-between gap-3 border-b border-[#e8e8ed] bg-white pb-2 md:flex-row md:items-center">
                    <nav aria-label="Worklist views" className="worklist-view-tabs flex shrink-0 items-center gap-1 sm:gap-2">
                        <button aria-current={viewMode === 'board' ? 'page' : undefined} className={`relative inline-flex h-10 items-center gap-2 text-[13px] ${viewMode === 'board' ? 'font-semibold text-[#234b38]' : 'text-[#78857d] hover:text-[#334b3c]'}`} onClick={() => setViewMode('board')} type="button"><Columns3 aria-hidden="true" className="size-4" />Kanban{viewMode === 'board' && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[#3c7154]" />}</button>
                        <button aria-current={viewMode === 'calendar' ? 'page' : undefined} className={`relative inline-flex h-10 items-center gap-2 text-[13px] ${viewMode === 'calendar' ? 'font-semibold text-[#234b38]' : 'text-[#78857d] hover:text-[#334b3c]'}`} onClick={() => setViewMode('calendar')} type="button"><CalendarDays aria-hidden="true" className="size-4" />Calendar{viewMode === 'calendar' && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[#3c7154]" />}</button>
                        <button aria-current={viewMode === 'list' ? 'page' : undefined} className={`relative inline-flex h-10 items-center gap-2 text-[13px] ${viewMode === 'list' ? 'font-semibold text-[#234b38]' : 'text-[#78857d] hover:text-[#334b3c]'}`} onClick={() => setViewMode('list')} type="button"><ListTodo aria-hidden="true" className="size-4" />List{viewMode === 'list' && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[#3c7154]" />}</button>
                    </nav>
                    <div className="flex min-w-0 flex-1 items-center gap-2 md:justify-end">
                        <div className="min-w-0 flex-1 md:flex md:justify-end">
                <WorklistControls compact
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
                        <span className="hidden shrink-0 text-xs text-[#849188] 2xl:inline">{data.filteredItems.length} tasks</span>
                        {user.role !== 'viewer' && <Button className="h-9 shrink-0 rounded-lg bg-[#202321] px-3.5 text-xs font-semibold text-white shadow-none hover:bg-[#343935]" onClick={() => setShowNewItem((shown) => !shown)} title="Keyboard shortcut: N"><Plus aria-hidden="true" className="size-4" />New Task</Button>}
                    </div>
                </section>
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
