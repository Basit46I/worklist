import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime.js'
import { WorkItemRow, WorklistBoard, WorklistFilterBuilder } from '@workspace/worklist-ui'
import type { WorklistTemplate } from '../../features/worklist/api.js'
import { CalendarViewPanel } from '../../features/worklist/components/calendar-page.js'
import { DashboardActionPanels, DashboardDataFootnote, DashboardDueSoonPanel, DashboardEmptyState, DashboardFocusPanel, DashboardListsPanel, DashboardOpenWorkPanel, DashboardStatCards, DashboardStatusPanel } from '../../features/worklist/components/dashboard-panels.js'
import { TemplateBuilderForm } from '../../features/worklist/components/template-builder-form.js'
import { TemplateLibraryPanel } from '../../features/worklist/components/template-library-panel.js'
import type { TemplateBuilderState, TemplateLibraryState } from '../../features/worklist/template-dialog-types.js'
import type { WorkItem } from '../../features/worklist/model.js'
import type { WorkItemFilter } from '../../features/worklist/model.js'
import { useDashboardData } from '../../features/worklist/use-dashboard-data.js'

const task: WorkItem = { id: 'task-1', listId: 'list-1', title: 'Ship onboarding', description: '', status: 'In progress', priority: 'High', assignee: 'Ayesha', dueDate: '2026-10-20' }
const template: WorklistTemplate = {
    id: 'template-1', name: 'Launch workflow', description: 'A release checklist', statuses: ['To do', 'In progress', 'Done'],
    tasks: [{ title: 'Confirm scope', description: '', status: 'To do', priority: 'Medium', dueDateOffsetDays: 1 }]
}

void test('calendar shows duration bars inside the month grid with resize handles', (context) => {
    context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-15T12:00:00.000Z') })
    const markup = renderToStaticMarkup(<CalendarViewPanel canEdit items={[
        { ...task, startDate: '2026-10-05', dueDate: '2026-10-10' },
        { ...task, id: 'task-2', title: 'Earlier task', startDate: '2026-10-14', dueDate: '2026-10-15' }
    ]} onUpdate={() => {}} />)

    assert.match(markup, /aria-label="calendar task timeline"/)
    assert.match(markup, /aria-label="Month calendar"/)
    assert.match(markup, /data-calendar-date="2026-10-05"/)
    assert.match(markup, /data-calendar-week="2026-10-05"/)
    assert.match(markup, /aria-label="Ship onboarding timeline bar"/)
    assert.match(markup, /Ship onboarding/)
    assert.match(markup, /6d/)
    assert.match(markup, /aria-label="Resize start of Ship onboarding"/)
    assert.match(markup, /aria-label="Resize due date of Ship onboarding"/)
    assert.match(markup, /aria-label="Earlier task timeline bar"/)
    assert.match(markup, /Calendar day Monday, October 5/)
    assert.doesNotMatch(markup, /Timeline start date/)
})

void test('archived task rows expose Restore while active task actions use a menu', () => {
    const renderRow = (archivedAt: string | null): string => renderToStaticMarkup(<table><tbody><WorkItemRow
        activityClient={{ list: async () => [] }}
        approvalClient={{ request: async () => {} }}
        availableItems={[]}
        canEdit
        columnWidths={{ status: 150, priority: 120, assignee: 180, dueDate: 140 }}
        columns={['status', 'priority', 'assignee', 'dueDate']}
        commentClient={{ list: async () => [], create: async (_itemId, body) => ({ id: 'comment-1', authorName: 'Ayesha', body, createdAt: '2026-10-23T00:00:00.000Z' }) }}
        commentRefreshItemId={null}
        commentRefreshSequence={0}
        expanded={false}
        item={{ ...task, archivedAt }}
        lists={[]}
        measureElement={() => {}}
        onCreateSubtask={() => {}}
        onDelete={() => {}}
        onDuplicate={() => {}}
        onToggleArchived={() => {}}
        onToggleExpanded={() => {}}
        onToggleSelect={() => {}}
        onUpdate={() => {}}
        selected={false}
        selectionLimitReached={false}
        statuses={['To do', 'In progress', 'Done']}
        virtualIndex={0}
    /></tbody></table>)
    const activeMarkup = renderRow(null)
    const archivedMarkup = renderRow('2026-10-22T00:00:00.000Z')

    assert.match(activeMarkup, /aria-label="Actions for Ship onboarding"/)
    assert.match(activeMarkup, /aria-haspopup="menu"/)
    assert.doesNotMatch(activeMarkup, /Restore Ship onboarding/)
    assert.match(archivedMarkup, /aria-label="Restore Ship onboarding"/)
    assert.match(archivedMarkup, />Restore</)
})

void test('board renders populated and empty status columns with editable and read-only task controls', () => {
    const updates: Array<{ id: string; changes: Partial<WorkItem> }> = []
    const addRequests: string[] = []
    const markup = renderToStaticMarkup(<>
        <WorklistBoard items={[{ ...task, description: 'Verify customer handoff.' }, { ...task, id: 'task-2', title: 'Unassigned task', assignee: 'Unassigned' }]} lists={[]} statuses={['In progress', 'Done']} canEdit onUpdate={(id, changes) => { updates.push({ id, changes }) }} onAddTask={(status) => { addRequests.push(status) }} />
        <WorklistBoard items={[task]} lists={[]} statuses={['In progress', 'Done']} canEdit={false} onUpdate={() => {}} onAddTask={() => {}} />
    </>)

    assert.match(markup, /aria-label="Tasks board"/)
    assert.match(markup, /aria-label="In progress tasks"/)
    assert.match(markup, /aria-label="Done tasks"/)
    assert.match(markup, /Verify customer handoff\./)
    assert.match(markup, /Unassigned task/)
    assert.match(markup, /disabled=""/)
    assert.deepEqual(updates, [])
    assert.deepEqual(addRequests, [])
})

void test('filter builder renders condition-specific controls and the empty-condition guidance', () => {
    const statuses = ['To do', 'In progress', 'Done'] as const
    const filters: readonly WorkItemFilter[] = [
        { field: 'status', operator: 'equals', value: 'In progress' },
        { field: 'priority', operator: 'equals', value: 'High' },
        { field: 'assignee', operator: 'contains', value: 'Ayesha' },
        { field: 'dueDate', operator: 'after', value: '2026-11-05' }
    ]
    const callbacks = { onStatusFilterChange: () => {}, onFilterLogicChange: () => {}, onAddFilter: () => {}, onUpdateFilter: () => {}, onRemoveFilter: () => {} }
    const markup = renderToStaticMarkup(<>
        <WorklistFilterBuilder activeStatuses={statuses} statusFilter="All" filters={[]} filterLogic="AND" {...callbacks} />
        <WorklistFilterBuilder activeStatuses={statuses} statusFilter="In progress" filters={filters} filterLogic="OR" {...callbacks} />
    </>)

    assert.match(markup, /No extra conditions yet/)
    assert.match(markup, /Filter by status/)
    assert.match(markup, /All conditions must match/)
    assert.match(markup, /Condition 1 field/)
    assert.match(markup, /Condition 3 operator/)
    assert.match(markup, /contains/)
    assert.match(markup, /is before/)
    assert.match(markup, /Condition 4 value/)
    assert.match(markup, /4 of 10 conditions/)
})

void test('dashboard panels render real task and list data, including no-data and overdue states', () => {
    const markup = renderToStaticMarkup(<>
        <DashboardStatusPanel metrics={{ total: 1, open: 1, inProgress: 1, dueThisWeek: 1, overdue: 1, completed: 0, statuses: [{ name: 'In progress', count: 1 }], priorities: [{ name: 'High', count: 1 }, { name: 'Medium', count: 0 }, { name: 'Low', count: 0 }], assignees: [{ name: 'Ayesha', count: 1 }], overdueAssignees: [{ name: 'Ayesha', count: 1 }] }} />
        <DashboardDueSoonPanel items={[task]} today="2026-10-21" />
        <DashboardListsPanel lists={[{ id: 'list-1', name: 'Release', description: '', spaceName: 'Product', folderName: '', isDefault: false, archivedAt: null, settings: { sortField: 'dueDate', sortDirection: 'asc', groupBy: 'status', visibleColumns: ['status'], columnWidths: { status: 180, priority: 130, assignee: 180, dueDate: 150 }, statuses: ['To do', 'Done'], budgetMinutes: 0 } }]} items={[task]} />
    </>)

    assert.match(markup, /Status breakdown/)
    assert.match(markup, /Ship onboarding/)
    assert.match(markup, /Overdue ·/)
    assert.match(markup, /Release/)
    assert.match(markup, /Product/)
})

void test('dashboard summary and action panels show populated, empty, and permission-aware states', () => {
    const emptyMetrics = { total: 0, open: 0, inProgress: 0, dueThisWeek: 0, overdue: 0, completed: 0, statuses: [], priorities: [], assignees: [], overdueAssignees: [] }
    const populatedMetrics = { total: 1, open: 1, inProgress: 1, dueThisWeek: 1, overdue: 1, completed: 0, statuses: [{ name: 'In progress', count: 1 }], priorities: [{ name: 'High', count: 1 }, { name: 'Medium', count: 0 }, { name: 'Low', count: 0 }], assignees: [{ name: 'Ayesha', count: 1 }], overdueAssignees: [{ name: 'Ayesha', count: 1 }] } as const
    const signals = { unassigned: [] as readonly WorkItem[], approvals: [task], blocked: [] as readonly WorkItem[], overBudget: [] as const }
    const markup = renderToStaticMarkup(<>
        <DashboardStatCards metrics={emptyMetrics} />
        <DashboardStatCards metrics={populatedMetrics} scopeLabel="Current list" />
        <DashboardFocusPanel items={[task]} today="2026-10-21" />
        <DashboardFocusPanel items={[]} today="2026-10-21" />
        <DashboardOpenWorkPanel metrics={populatedMetrics} maxOpen={1} />
        <DashboardOpenWorkPanel metrics={emptyMetrics} maxOpen={0} />
        <DashboardActionPanels signals={signals} />
        <DashboardEmptyState canCreate />
        <DashboardEmptyState canCreate={false} />
        <DashboardDataFootnote />
    </>)

    assert.match(markup, /No tasks yet/)
    assert.match(markup, /Current list/)
    assert.match(markup, /Keep the important work moving/)
    assert.match(markup, /Nothing needs attention in this view/)
    assert.match(markup, /Overdue by owner/)
    assert.match(markup, /No open work in this scope/)
    assert.match(markup, /Approval queue/)
    assert.match(markup, /Add your first task/)
    assert.match(markup, /Live workspace data/)
})

void test('template library renders selected template preview, tasks, workflow, and list fields', () => {
    const markup = renderToStaticMarkup(<TemplateLibraryPanel actions={{ createFromTemplate: async () => {}, editTemplate: () => {}, removeTemplate: () => {} }} state={libraryState()} />)

    assert.match(markup, /Launch workflow/)
    assert.match(markup, /Confirm scope/)
    assert.match(markup, /aria-label="Template list name"/)
    assert.match(markup, /aria-label="Template list space"/)
    assert.match(markup, /Use template/)
})

void test('template builder exposes the status and task rules through labeled controls', () => {
    const markup = renderToStaticMarkup(<TemplateBuilderForm actions={{ saveTemplate: async () => {} }} state={builderState()} />)

    assert.match(markup, /aria-label="Template name"/)
    assert.match(markup, /aria-label="Template statuses"/)
    assert.match(markup, /One status per line/)
    assert.match(markup, /aria-label="Template task titles"/)
    assert.match(markup, /up to 50/)
})

void test('dashboard data hook exposes a stable loading state before its client request starts', () => {
    const router = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch: async () => {} }
    const Probe = () => {
        const data = useDashboardData()
        return <output>{JSON.stringify({ user: data.user, lists: data.lists.length, items: data.items.length, scope: data.scope, loading: data.loading,
            signOutBusy: data.signOutBusy, error: data.error, total: data.metrics.total, open: data.metrics.open, dueSoon: data.dueSoon.length,
            greeting: data.greeting, myTasksOnly: data.myTasksOnly, overBudget: data.signals.overBudget.length })}</output>
    }
    const markup = renderToStaticMarkup(<AppRouterContext.Provider value={router as never}><Probe /></AppRouterContext.Provider>)
    assert.match(markup, /&quot;scope&quot;:&quot;all&quot;/)
    assert.match(markup, /&quot;loading&quot;:true/)
    assert.match(markup, /&quot;lists&quot;:0/)
    assert.match(markup, /&quot;items&quot;:0/)
    assert.match(markup, /&quot;total&quot;:0/)
})

const libraryState = (): TemplateLibraryState => ({
    templates: [template], templateId: template.id, setTemplateId: () => {}, templateListName: 'October release', setTemplateListName: () => {},
    newListSpace: 'Product', setNewListSpace: () => {}, newListFolder: '', setNewListFolder: () => {}, creatingTemplate: false,
    setTemplateEditingId: () => {}, setTemplateNameDraft: () => {}, setTemplateDescriptionDraft: () => {}, setTemplateStatusesDraft: () => {}, setTemplateTasksDraft: () => {}, setShowTemplateBuilder: () => {}
})

const builderState = (): TemplateBuilderState => ({
    templateEditingId: '', templateNameDraft: 'Launch', setTemplateNameDraft: () => {}, templateDescriptionDraft: '', setTemplateDescriptionDraft: () => {},
    templateStatusesDraft: 'To do\nDone', setTemplateStatusesDraft: () => {}, templateTasksDraft: '', setTemplateTasksDraft: () => {}, setShowTemplateBuilder: () => {}, setTemplateEditingId: () => {}
})
