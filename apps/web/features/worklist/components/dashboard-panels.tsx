import type { ReactElement } from 'react'
import { ArrowRight, AlertTriangle, CheckCircle2, CircleCheck, ClipboardList, Clock3, ListChecks, Plus, Users, Activity } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@workspace/ui/primitives'
import type { WorklistList } from '../api'
import type { WorkItem, WorkItemPriority } from '../model'
import type { DashboardMetrics, DashboardSignals } from '../dashboard-model'
import { formatCount, formatDate, initials, priorityColor, statusColor } from '../dashboard-presentation'

const cardClass = 'rounded-2xl border border-[#e0e5dd] bg-white p-5 shadow-[0_10px_28px_-24px_rgba(23,33,28,.32)]'

export const DashboardStatCards = ({ metrics, scopeLabel = 'Across this workspace' }: Readonly<{ metrics: DashboardMetrics; scopeLabel?: string }>): ReactElement => (
    <section aria-label="Workspace task summary" className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-5">
        <StatCard detail={scopeLabel} icon={ClipboardList} label="Total tasks" value={metrics.total} />
        <StatCard detail={`${metrics.open} still open`} icon={Activity} label="In progress" value={metrics.inProgress} />
        <StatCard detail={metrics.total ? `${Math.round((metrics.completed / metrics.total) * 100)}% of all tasks` : 'No tasks yet'} icon={CircleCheck} label="Completed" value={metrics.completed} />
        <StatCard detail={metrics.overdue ? 'Needs attention' : 'All caught up'} icon={AlertTriangle} label="Overdue" value={metrics.overdue} warning />
        <StatCard detail="Completed / total tasks" icon={Clock3} label="Progress" value={metrics.total ? Math.round((metrics.completed / metrics.total) * 100) : 0} suffix="%" />
    </section>
)

const StatCard = ({ icon: Icon, label, value, detail, warning = false, suffix }: Readonly<{
    icon: typeof ClipboardList; label: string; value: number; detail: string; warning?: boolean; suffix?: string
}>): ReactElement => (
    <article className="relative min-h-32 overflow-hidden rounded-2xl border border-[#e0e5dd] bg-white p-4 shadow-[0_10px_28px_-24px_rgba(23,33,28,.32)] transition hover:-translate-y-0.5 hover:border-[#cbd8c3] sm:p-5">
        <span className={`flex items-center gap-2 text-xs font-medium ${warning ? 'text-[#a44e3e]' : 'text-[#879188]'}`}><Icon aria-hidden="true" className="size-4" />{label}</span>
        <strong className={`mt-3 block text-3xl font-semibold tabular-nums tracking-[-.04em] ${warning && value ? 'text-[#a44e3e]' : 'text-[#17211c]'}`}>{value}{suffix}</strong>
        <span className="mt-1 block text-xs text-[#718076]">{detail}</span>
    </article>
)

export const DashboardStatusPanel = ({ metrics }: Readonly<{ metrics: DashboardMetrics }>): ReactElement => (
    <section aria-label="Status breakdown" className={cardClass}>
        <PanelHeader title="Status breakdown" detail={formatCount(metrics.total, 'task')} />
        {metrics.statuses.length ? <>
            <div aria-label="Task status proportions" className="flex h-3 overflow-hidden rounded-full bg-[#eef0ec]" role="img">
                {metrics.statuses.map(({ count, name }) => <span key={name} style={{ backgroundColor: statusColor(name), flex: count }} title={`${name}: ${count}`} />)}
            </div>
            <ul className="mt-4 grid gap-2">{metrics.statuses.map(({ count, name }) => <li className="grid grid-cols-[12px_1fr_auto] items-center gap-2 text-sm text-[#59645b]" key={name}>
                <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: statusColor(name) }} /><span>{name}</span><strong className="tabular-nums text-[#263329]">{count}</strong>
            </li>)}</ul>
        </> : <EmptyPanel>No status data for this scope.</EmptyPanel>}
    </section>
)

export const DashboardFocusPanel = ({ className = '', items, today }: Readonly<{
    className?: string
    items: readonly WorkItem[]
    today: string
}>): ReactElement => (
    <section aria-label="Tasks needing attention" className={`${cardClass} ${className}`}>
        <header className="mb-3 flex items-end justify-between gap-3"><div><h2 className="font-serif text-xl text-[#203d33]">Keep the important work moving</h2><p className="mt-1 text-xs text-[#879188]">Your next open tasks, ordered by due date</p></div><Link className="shrink-0 text-xs font-medium text-[#315d4c] hover:underline" href="/worklist">Open list <ArrowRight aria-hidden="true" className="ml-1 inline size-3.5" /></Link></header>
        {items.length ? <ul className="divide-y divide-[#edf0eb]">{items.slice(0, 4).map((item) => {
            const overdue = item.dueDate < today
            return <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 first:pt-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]" key={item.id}>
                <Link className="flex min-w-0 items-center gap-3" href={item.listId ? `/worklist?listId=${encodeURIComponent(item.listId)}` : '/worklist'}><span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: statusColor(item.status) ?? '#668356' }} /><span className="min-w-0"><span className="block truncate text-sm font-medium text-[#263329]">{item.title}</span><span className="mt-0.5 block truncate text-[11px] text-[#879188]">{item.assignee || 'Unassigned'}</span></span></Link>
                <span className="hidden rounded-md px-2 py-1 text-[10px] font-medium sm:inline-flex" style={{ backgroundColor: `${statusColor(item.status) ?? '#668356'}20`, color: '#52665a' }}>{item.status}</span>
                <span className={`col-start-2 text-right text-xs tabular-nums sm:col-start-auto ${overdue ? 'text-[#ad5949]' : 'text-[#718076]'}`}>{overdue ? 'Overdue · ' : ''}{formatDate(item.dueDate)}</span>
            </li>
        })}</ul> : <EmptyPanel>Nothing needs attention in this view. Your open tasks will appear here.</EmptyPanel>}
    </section>
)

export const DashboardDueSoonPanel = ({ items, today }: Readonly<{ items: readonly WorkItem[]; today: string }>): ReactElement => (
    <section aria-label="Due soon" className={`${cardClass} xl:col-span-7`}>
        <header className="mb-3 flex items-start justify-between gap-3"><div><h2 className="text-base font-semibold tracking-tight text-[#263329]">In-app deadline reminders</h2><p className="mt-1 text-xs text-[#879188]">Overdue and upcoming tasks · shown when you open the dashboard</p></div><Link className="text-sm font-medium text-[#526d46] hover:underline" href="/worklist">View all</Link></header>
        {items.length ? <ul className="divide-y divide-[#edf0eb]">{items.map((item) => {
            const overdue = item.dueDate < today
            return <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 first:pt-2 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto_auto]" key={item.id}>
                <Link className="flex min-w-0 items-center gap-2 text-sm font-medium text-[#344238] hover:text-[#526d46] hover:underline" href="/worklist"><span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: statusColor(item.status) }} /><span className="truncate">{item.title}</span></Link>
                <span className="rounded-full px-2 py-1 text-[10px] font-semibold" style={{ backgroundColor: `${priorityColor(item.priority)}28`, color: item.priority === 'High' ? '#a44e3e' : item.priority === 'Medium' ? '#8b6725' : '#69736b' }}>{item.priority}</span>
                <span className={`col-start-2 text-right text-xs tabular-nums sm:col-start-auto ${overdue ? 'text-[#a44e3e]' : 'text-[#718076]'}`}>{overdue ? 'Overdue · ' : ''}{formatDate(item.dueDate)}</span>
            </li>
        })}</ul> : <p className="py-5 text-sm text-[#718076]">Nothing open in this scope.</p>}
    </section>
)

export const DashboardOpenWorkPanel = ({ metrics, maxOpen }: Readonly<{ metrics: DashboardMetrics; maxOpen: number }>): ReactElement => (
    <section aria-label="Open work" className={`${cardClass} xl:col-span-5`}>
        <PanelHeader title="Open work" detail="By priority and by assignee" />
        <div className="space-y-3">{metrics.priorities.map(({ count, name }) => <MetricBar count={count} key={name} label={name} max={maxOpen} color={priorityColor(name)} />)}</div>
        <div className="my-4 border-t border-[#edf0eb]" />
        {metrics.assignees.length ? <div className="space-y-3">{metrics.assignees.map(({ count, name }) => <MetricBar count={count} key={name} label={name} max={maxOpen} initials={initials(name)} />)}</div> : <p className="text-sm text-[#718076]">No open work in this scope.</p>}
        {metrics.overdueAssignees.length > 0 && <>
            <div className="my-4 border-t border-[#edf0eb]" />
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#a44e3e]">Overdue by owner</h3>
            <div className="space-y-3">{metrics.overdueAssignees.map(({ count, name }) => <MetricBar count={count} key={name} label={name} max={Math.max(1, ...metrics.overdueAssignees.map((entry) => entry.count))} color="#b96250" initials={initials(name)} />)}</div>
        </>}
    </section>
)

const MetricBar = ({ count, label, max, color = '#668356', initials: avatar }: Readonly<{ count: number; label: string; max: number; color?: string; initials?: string }>): ReactElement => (
    <div className="grid grid-cols-[84px_minmax(0,1fr)_24px] items-center gap-2 text-xs text-[#59645b]">
        <span className="flex min-w-0 items-center gap-2">{avatar ? <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-[#edf2e9] text-[9px] font-semibold text-[#526d46]">{avatar}</span> : <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: color }} />}<span className="truncate">{label}</span></span>
        <span className="h-2 overflow-hidden rounded-full bg-[#eef0ec]"><span className="block h-full rounded-full" style={{ width: `${(count / max) * 100}%`, backgroundColor: color }} /></span>
        <strong className="text-right tabular-nums text-[#263329]">{count}</strong>
    </div>
)

export const DashboardListsPanel = ({ lists, items }: Readonly<{ lists: readonly WorklistList[]; items: readonly WorkItem[] }>): ReactElement => (
    <section aria-label="Lists" className={`${cardClass} xl:col-span-7`}>
        <PanelHeader title="Lists" detail="Progress per list · click to open" />
        <div className="divide-y divide-[#edf0eb]">{lists.map((list) => {
            const listItems = items.filter((item) => item.listId === list.id)
            const done = listItems.filter((item) => item.status === 'Done').length
            return <Link className="flex items-center gap-3 py-3 first:pt-1 last:pb-0" href={`/worklist?listId=${encodeURIComponent(list.id)}`} key={list.id}>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-[#263329]">{list.name}</span><span className="mt-0.5 block truncate text-xs text-[#879188]">{list.spaceName}{list.folderName ? ` / ${list.folderName}` : ''}</span>
                    <span aria-label={`${list.name}: ${done} of ${listItems.length} tasks complete`} className="mt-2 block h-1.5 overflow-hidden rounded-full bg-[#eef0ec]"><span className="block h-full rounded-full bg-[#4a9a70]" style={{ width: `${listItems.length ? (done / listItems.length) * 100 : 0}%` }} /></span>
                    <span className="mt-1 block text-xs text-[#879188]">{Math.round(listItems.reduce((total, item) => total + (item.timeSpentMinutes ?? 0), 0) / 60 * 10) / 10}h tracked{list.settings.budgetMinutes ? ` / ${(list.settings.budgetMinutes / 60).toFixed(1)}h budget` : ''}</span>
                </span><span className="whitespace-nowrap text-xs text-[#718076]">{done}/{listItems.length} done</span><ArrowRight aria-hidden="true" className="size-4 text-[#879188]" />
            </Link>
        })}</div>
        {!lists.length && <EmptyPanel>No lists are available yet.</EmptyPanel>}
    </section>
)

export const DashboardActionPanels = ({ signals }: Readonly<{ signals: DashboardSignals }>): ReactElement => (
    <section aria-label="Work needing attention" className="grid gap-4 xl:grid-cols-2">
        <DashboardTaskSignalPanel title="Unassigned work" detail="Open tasks that need an owner" empty="All open tasks have an assignee." items={signals.unassigned} />
        <DashboardTaskSignalPanel title="Approval queue" detail="Waiting for approval or requested changes" empty="No approvals need attention." items={signals.approvals} />
        <DashboardTaskSignalPanel title="Blocked tasks" detail="Open tasks waiting on another unfinished task" empty="No tasks are blocked by dependencies." items={signals.blocked} />
        <section aria-label="Lists over time budget" className={cardClass}>
            <PanelHeader title="Over budget" detail="Tracked time has passed the list budget" />
            {signals.overBudget.length ? <ul className="divide-y divide-[#edf0eb]">{signals.overBudget.map(({ budgetMinutes, list, trackedMinutes }) => {
                const overBy = trackedMinutes - budgetMinutes
                return <li className="flex items-center gap-3 py-3 first:pt-1 last:pb-0" key={list.id}>
                    <span className="min-w-0 flex-1"><Link className="block truncate text-sm font-medium text-[#344238] hover:underline" href={`/worklist?listId=${encodeURIComponent(list.id)}`}>{list.name}</Link><span className="mt-1 block text-xs text-[#879188]">{(trackedMinutes / 60).toFixed(1)}h tracked · {(budgetMinutes / 60).toFixed(1)}h budget</span></span>
                    <strong className="whitespace-nowrap text-xs font-semibold text-[#a44e3e]">+{(overBy / 60).toFixed(1)}h</strong>
                </li>
            })}</ul> : <EmptyPanel>No lists are over their time budget.</EmptyPanel>}
        </section>
    </section>
)

const DashboardTaskSignalPanel = ({ title, detail, empty, items }: Readonly<{ title: string; detail: string; empty: string; items: readonly WorkItem[] }>): ReactElement => (
    <section aria-label={title} className={cardClass}>
        <PanelHeader title={title} detail={`${detail} · ${items.length}`} />
        {items.length ? <ul className="divide-y divide-[#edf0eb]">{items.slice(0, 5).map((item) => <li className="flex items-center gap-3 py-3 first:pt-1 last:pb-0" key={item.id}>
            <Link className="min-w-0 flex-1 truncate text-sm font-medium text-[#344238] hover:underline" href={item.listId ? `/worklist?listId=${encodeURIComponent(item.listId)}` : '/worklist'}>{item.title}</Link>
            <span className="max-w-28 truncate text-xs text-[#879188]">{item.assignee || 'Unassigned'}</span>
        </li>)}</ul> : <EmptyPanel>{empty}</EmptyPanel>}
        {items.length > 5 && <Link className="mt-3 inline-block text-xs font-medium text-[#526d46] hover:underline" href="/worklist">Open worklist · {items.length - 5} more</Link>}
    </section>
)

export const DashboardEmptyState = ({ canCreate }: Readonly<{ canCreate: boolean }>): ReactElement => (
    <div className="mb-4 rounded-2xl border border-dashed border-[#cbd5c7] bg-white px-5 py-8 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#eef4e9]"><ListChecks aria-hidden="true" className="size-5 text-[#668356]" /></div>
        <h2 className="mt-4 text-lg font-semibold text-[#253328]">No tasks in this scope yet</h2><p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-[#758078]">Add a task to start building a clear picture of your team’s work.</p>
        {canCreate && <Button asChild className="mt-4 h-10 rounded-xl bg-[#243b2c] px-4 text-white hover:bg-[#314b37]"><Link href="/worklist?newTask=1"><Plus aria-hidden="true" className="size-4" />Add your first task</Link></Button>}
    </div>
)

export const DashboardDataFootnote = (): ReactElement => <p className="mt-6 flex items-center gap-2 text-xs text-[#879188]"><CheckCircle2 aria-hidden="true" className="size-3.5 text-[#668356]" />Dashboard metrics are calculated from your saved workspace tasks.<Users aria-hidden="true" className="ml-auto size-3.5" />Live workspace data</p>

const PanelHeader = ({ title, detail }: Readonly<{ title: string; detail: string }>): ReactElement => <header className="mb-4"><h2 className="text-base font-semibold tracking-tight text-[#263329]">{title}</h2><p className="mt-1 text-xs text-[#879188]">{detail}</p></header>
const EmptyPanel = ({ children }: Readonly<{ children: string }>): ReactElement => <p className="rounded-xl border border-dashed border-[#dfe6db] p-4 text-sm text-[#718076]">{children}</p>

export const dashboardPriorityColor = (priority: WorkItemPriority): string => priorityColor(priority)
