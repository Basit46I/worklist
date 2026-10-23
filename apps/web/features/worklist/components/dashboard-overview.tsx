import type { ReactElement } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowRight, BadgeCheck, CheckCircle2, CircleDot, Clock3, FolderKanban, ListChecks, Users, UserRoundX, type LucideIcon } from 'lucide-react'
import type { WorklistList } from '../api'
import type { WorkItem } from '../model'
import type { DashboardMetrics, DashboardSignals } from '../dashboard-model'
import { formatDate, initials, priorityColor, statusColor } from '../dashboard-presentation'

type DashboardOverviewProps = Readonly<{
    items: readonly WorkItem[]
    lists: readonly WorklistList[]
    metrics: DashboardMetrics
    signals: DashboardSignals
    dueSoon: readonly WorkItem[]
    today: string
    canCreate: boolean
}>

const panel = 'rounded-2xl border border-[#e7e9e5] bg-white shadow-[0_12px_32px_-28px_rgba(23,33,28,.4)]'
type DashboardHref = '/worklist' | '/dashboard#reports'

const countPercent = (part: number, total: number): number => total ? Math.round((part / total) * 100) : 0

export const DashboardOverview = ({ items, lists, metrics, signals, dueSoon, today, canCreate }: DashboardOverviewProps): ReactElement => {
    const progress = countPercent(metrics.completed, metrics.total)

    return <>
        {!items.length && <section className={`${panel} mb-5 flex flex-wrap items-center justify-between gap-3 border-dashed px-5 py-4`}>
            <span className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-[#eaf3ec] text-[#397252]"><FolderKanban aria-hidden="true" className="size-4" /></span><span><strong className="block text-xs font-semibold text-[#354239]">Your workspace starts here</strong><span className="mt-1 block text-[10px] text-[#87928a]">Create a task to see your team’s work in this overview.</span></span></span>
            {canCreate && <Link className="inline-flex h-9 items-center rounded-lg bg-[#245d43] px-3 text-xs font-semibold text-white transition hover:bg-[#174638] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b8b69]" href="/worklist?newTask=1">Create task</Link>}
        </section>}
            <section aria-label="Workspace summary" className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard icon={ListChecks} label="Open work" value={metrics.open} note={`${metrics.inProgress} in progress`} tone="sage" />
                <SummaryCard icon={Clock3} label="Due this week" value={metrics.dueThisWeek} note="Next seven days" tone="sage" />
                <SummaryCard icon={CheckCircle2} label="Completed" value={metrics.completed} note={`${progress}% of all tasks`} tone="green" />
                <SummaryCard icon={AlertCircle} label="Overdue" value={metrics.overdue} note={metrics.overdue ? 'Needs a follow-up' : 'Nothing late'} tone={metrics.overdue ? 'rose' : 'neutral'} />
            </section>

            <section className="mb-5 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,.85fr)]">
                <article aria-label="Upcoming tasks" className={`${panel} overflow-hidden`}>
                    <PanelHeading title="Coming up" detail="Open tasks, ordered by due date" href="/worklist" linkLabel="View all" />
                    {dueSoon.length ? <ul className="divide-y divide-[#eff1ee] px-4 sm:px-5">{dueSoon.slice(0, 6).map((item) => <UpcomingTask item={item} key={item.id} lists={lists} today={today} />)}</ul> : <EmptyPanel>All caught up. New open tasks will appear here.</EmptyPanel>}
                </article>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                    <StatusBreakdown metrics={metrics} />
                    <TeamWorkload metrics={metrics} />
                </div>
            </section>

            <section aria-label="Workspace lists" className={`${panel} mb-5 overflow-hidden`}>
                <PanelHeading title="Your lists" detail={`${lists.length} active ${lists.length === 1 ? 'list' : 'lists'} · progress from saved tasks`} href="/worklist" linkLabel="Open workspace" />
                {lists.length ? <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">{lists.slice(0, 6).map((list) => <ListCard items={items} key={list.id} list={list} />)}</div> : <EmptyPanel>No active lists yet. Create one in the worklist.</EmptyPanel>}
            </section>

            <AttentionSection signals={signals} />
        <p className="mt-5 flex items-center gap-2 px-1 text-[11px] text-[#87928a]"><span className="size-1.5 rounded-full bg-[#71a685]" />Live workspace data · refreshed from saved tasks</p>
    </>
}

const SummaryCard = ({ icon: Icon, label, value, note, tone }: Readonly<{ icon: LucideIcon; label: string; value: number; note: string; tone: 'sage' | 'green' | 'rose' | 'neutral' }>): ReactElement => {
    const toneStyles = { sage: 'bg-[#eef3ed] text-[#54765c]', green: 'bg-[#eaf3ed] text-[#397252]', rose: 'bg-[#fbefed] text-[#c56b62]', neutral: 'bg-[#f0f2ef] text-[#77837a]' }
    return <article className={`${panel} flex min-h-28 items-center gap-3.5 p-4 sm:p-5`}>
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${toneStyles[tone]}`}><Icon aria-hidden="true" className="size-[18px]" /></span>
        <span className="min-w-0"><span className="block text-xs font-medium text-[#818c84]">{label}</span><strong className="mt-0.5 block text-2xl font-semibold leading-7 tracking-tight text-[#27342c]">{value}</strong><span className="mt-0.5 block truncate text-[10px] text-[#9aa39c]">{note}</span></span>
    </article>
}

const PanelHeading = ({ title, detail, href, linkLabel }: Readonly<{ title: string; detail: string; href?: DashboardHref; linkLabel?: string }>): ReactElement => <header className="flex items-center justify-between gap-3 border-b border-[#eff1ee] px-4 py-4 sm:px-5"><div><h2 className="text-sm font-semibold text-[#2e3b33]">{title}</h2><p className="mt-1 text-[11px] text-[#87928a]">{detail}</p></div>{href && <Link className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[#326b4d] transition-colors hover:text-[#174638]" href={href}>{linkLabel}<ArrowRight aria-hidden="true" className="size-3.5" /></Link>}</header>

const UpcomingTask = ({ item, lists, today }: Readonly<{ item: WorkItem; lists: readonly WorklistList[]; today: string }>): ReactElement => {
    const overdue = item.dueDate < today
    const listName = lists.find((list) => list.id === item.listId)?.name
    return <li className="flex min-w-0 items-center gap-3 py-3.5">
        <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: statusColor(item.status) }} />
        <Link className="group min-w-0 flex-1" href={item.listId ? `/worklist?listId=${encodeURIComponent(item.listId)}` : '/worklist'}><span className="block truncate text-xs font-semibold text-[#344138] transition-colors group-hover:text-[#245d43]">{item.title}</span><span className="mt-1 block truncate text-[10px] text-[#929b94]">{listName ?? 'Workspace'} · {item.assignee || 'Unassigned'}</span></Link>
        <span className="hidden rounded-lg px-2 py-1 text-[10px] font-semibold sm:inline-flex" style={{ color: priorityColor(item.priority), backgroundColor: `${priorityColor(item.priority)}18` }}>{item.priority}</span>
        <span className={`w-[74px] shrink-0 text-right text-[10px] font-medium tabular-nums ${overdue ? 'text-[#bf625b]' : 'text-[#78847c]'}`}>{overdue ? 'Overdue · ' : ''}{formatDate(item.dueDate)}</span>
    </li>
}

const StatusBreakdown = ({ metrics }: Readonly<{ metrics: DashboardMetrics }>): ReactElement => <section aria-label="Task status distribution" className={`${panel} p-4 sm:p-5`}>
    <h2 className="text-sm font-semibold text-[#2e3b33]">Status overview</h2><p className="mt-1 text-[11px] text-[#87928a]">How tasks are progressing</p>
    <div aria-label="Task status distribution" className="mt-4 flex h-2 overflow-hidden rounded-full bg-[#f0f2ef]" role="img">{metrics.statuses.map(({ count, name }) => <span key={name} style={{ backgroundColor: statusColor(name), flex: count }} title={`${name}: ${count}`} />)}</div>
    <ul className="mt-4 space-y-2.5">{metrics.statuses.slice(0, 4).map(({ count, name }) => <li className="flex items-center gap-2 text-[11px]" key={name}><span className="size-2 rounded-full" style={{ backgroundColor: statusColor(name) }} /><span className="min-w-0 flex-1 truncate text-[#6d7971]">{name}</span><strong className="tabular-nums text-[#38463d]">{count}</strong></li>)}</ul>
</section>

const TeamWorkload = ({ metrics }: Readonly<{ metrics: DashboardMetrics }>): ReactElement => <section aria-label="Open tasks by assignee" className={`${panel} p-4 sm:p-5`}>
    <div className="flex items-center gap-2"><Users aria-hidden="true" className="size-4 text-[#87928a]" /><h2 className="text-sm font-semibold text-[#2e3b33]">Team workload</h2></div><p className="mt-1 text-[11px] text-[#87928a]">Open tasks by owner</p>
    {metrics.assignees.length ? <ul className="mt-3 space-y-3">{metrics.assignees.slice(0, 4).map(({ count, name }) => <li className="grid grid-cols-[minmax(0,1fr)_28px] items-center gap-3" key={name}><span className="flex min-w-0 items-center gap-2"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#f4e9e1] text-[8px] font-semibold text-[#945f45]">{initials(name)}</span><span className="truncate text-[10px] text-[#6d7971]">{name}</span></span><strong className="text-right text-[11px] tabular-nums text-[#38463d]">{count}</strong><span className="col-span-2 -mt-2 h-1 overflow-hidden rounded-full bg-[#f0f2ef]"><span className="block h-full rounded-full bg-[#82a58b]" style={{ width: `${countPercent(count, Math.max(1, ...metrics.assignees.map((entry) => entry.count)))}%` }} /></span></li>)}</ul> : <p className="mt-4 text-xs text-[#8c968f]">No open tasks assigned yet.</p>}
</section>

const ListCard = ({ list, items }: Readonly<{ list: WorklistList; items: readonly WorkItem[] }>): ReactElement => {
    const listItems = items.filter((item) => item.listId === list.id)
    const completed = listItems.filter((item) => item.status === 'Done').length
    const percent = countPercent(completed, listItems.length)
    const tracked = listItems.reduce((total, item) => total + (item.timeSpentMinutes ?? 0), 0)
    return <Link className="group rounded-lg border border-[#e1e8e0] bg-[#fcfdfb] p-4 transition duration-150 hover:border-[#a9c4b0] hover:bg-white hover:shadow-[0_10px_24px_-20px_rgba(34,91,62,.32)]" href={`/worklist?listId=${encodeURIComponent(list.id)}`}>
        <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#eaf3ec] text-[#397252]"><FolderKanban aria-hidden="true" className="size-4" /></span><span className="min-w-0 flex-1"><strong className="block truncate text-xs font-semibold text-[#354239] transition-colors group-hover:text-[#245d43]">{list.name}</strong><span className="mt-1 block truncate text-[10px] text-[#929b94]">{list.spaceName}{list.folderName ? ` / ${list.folderName}` : ''}</span></span><ArrowRight aria-hidden="true" className="mt-1 size-3.5 text-[#7e9283] transition duration-150 group-hover:translate-x-0.5 group-hover:text-[#245d43]" /></div>
        <div className="mt-4 flex items-center justify-between text-[10px]"><span className="text-[#7d8981]">{completed} of {listItems.length} complete</span><strong className="tabular-nums text-[#56645a]">{percent}%</strong></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#edf0ec]"><span className="block h-full rounded-full bg-[#79a18a]" style={{ width: `${percent}%` }} /></div>
        <div className="mt-3 flex items-center justify-between gap-2 text-[9px] text-[#929b94]"><span>{(tracked / 60).toFixed(1)}h tracked</span><span>{list.settings.budgetMinutes ? `${(list.settings.budgetMinutes / 60).toFixed(0)}h budget` : 'No budget set'}</span></div>
    </Link>
}

const AttentionSection = ({ signals }: Readonly<{ signals: DashboardSignals }>): ReactElement => {
    const groups: readonly Readonly<{ label: string; count: number; icon: LucideIcon; color: string; href: DashboardHref; detail: string }>[] = [
        { label: 'Unassigned', count: signals.unassigned.length, icon: UserRoundX, color: '#568063', href: '/worklist', detail: 'Tasks that need an owner' },
        { label: 'Approvals', count: signals.approvals.length, icon: BadgeCheck, color: '#8b78bc', href: '/worklist', detail: 'Waiting for a decision' },
        { label: 'Blocked', count: signals.blocked.length, icon: CircleDot, color: '#c56b62', href: '/worklist', detail: 'Waiting on another task' },
        { label: 'Over budget', count: signals.overBudget.length, icon: Clock3, color: '#a44e3e', href: '/dashboard#reports', detail: 'Lists over tracked time' },
    ]
    return <section aria-label="Needs attention" className={`${panel} overflow-hidden`}><PanelHeading title="Needs attention" detail="Items that may need a team follow-up" href="/worklist" linkLabel="Review work" /><div className="grid sm:grid-cols-2 xl:grid-cols-4">{groups.map(({ count, detail, href, icon: Icon, label, color }) => <Link className="flex items-center gap-3 border-b border-[#eff1ee] px-4 py-4 transition hover:bg-[#fcfcfb] sm:border-r xl:border-b-0" href={href} key={label}><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#f6f5f1]" style={{ color }}><Icon aria-hidden="true" className="size-4" /></span><span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold text-[#3e4a42]">{label}</span><span className="mt-1 block truncate text-[9px] text-[#929b94]">{detail}</span></span><strong className="text-lg tabular-nums text-[#36443b]">{count}</strong></Link>)}</div></section>
}

const EmptyPanel = ({ children }: Readonly<{ children: string }>): ReactElement => <p className="px-5 py-8 text-center text-xs text-[#87928a]">{children}</p>
