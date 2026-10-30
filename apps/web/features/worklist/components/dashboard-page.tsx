'use client'

import type { ReactElement } from 'react'
import Link from 'next/link'
import { Button } from '@workspace/ui/primitives'
import { ApplicationShell } from './application-shell'
import { DashboardOverview } from './dashboard-overview'
import { useDashboardData } from '../use-dashboard-data'
import { canEditWorkspace } from '../permissions'
import { statusColor } from '../dashboard-presentation'

export const DashboardPage = (): ReactElement => {
    const { user, lists, scopedItems, scopedLists, scope, setScope, myTasksOnly, setMyTasksOnly, loading, signOutBusy, error, today, metrics, signals, dueSoon, logout } = useDashboardData()

    if (!user) return <DashboardConnectionState error={error} loading={loading} />

    return (
        <ApplicationShell activeRoute="dashboard" onSignOut={logout} signOutBusy={signOutBusy} user={user}>
            <div className="dashboard-page mx-auto max-w-[1560px] px-5 pb-10 pt-7 sm:px-8 sm:pt-8">
                <DashboardIntro
                    lists={lists}
                    onScopeChange={setScope}
                    myTasksOnly={myTasksOnly}
                    onMyTasksChange={setMyTasksOnly}
                    scope={scope}
                    user={user}
                />
                {error && <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">{error}</p>}
                {loading ? <DashboardLoading /> : <>
                    <DashboardOverview canCreate={canEditWorkspace(user.role)} dueSoon={dueSoon} items={scopedItems} lists={scopedLists} metrics={metrics} signals={signals} today={today} />
                    <DashboardReports items={scopedItems} lists={scopedLists} metrics={metrics} />
                </>}
            </div>
        </ApplicationShell>
    )
}

const DashboardIntro = ({ lists, onScopeChange, myTasksOnly, onMyTasksChange, scope, user }: Readonly<{
    lists: ReturnType<typeof useDashboardData>['lists']
    onScopeChange: (scope: string) => void
    myTasksOnly: boolean
    onMyTasksChange: (enabled: boolean) => void
    scope: string
    user: NonNullable<ReturnType<typeof useDashboardData>['user']>
}>): ReactElement => (
    <header className="dashboard-page-heading mb-6 flex flex-col justify-between gap-5 rounded-2xl border border-[#e7e9e5] bg-white px-5 py-5 shadow-[0_12px_32px_-28px_rgba(23,33,28,.4)] sm:flex-row sm:items-end sm:px-6">
        <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#527c5d]">{new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())} <span className="px-1 text-[#b8beb8]">/</span> {user.teamName}</p><h1 className="mt-2 text-2xl font-semibold tracking-[-.035em] text-[#26352d] sm:text-3xl">Workspace overview</h1><p className="mt-1 text-sm text-[#7b867e]">A clear read on your team’s workload and deadlines.</p></div>
        <div className="flex flex-wrap items-center gap-2">
            <label className="flex h-10 items-center gap-2 rounded-xl border border-[#e5e9e3] bg-[#fafbf9] px-3 text-[11px] text-[#7f8a82]">List<select aria-label="Dashboard scope" className="max-w-40 bg-transparent text-xs font-semibold text-[#354239] outline-none" onChange={(event) => onScopeChange(event.target.value)} value={scope}><option value="all">All lists</option>{lists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}</select></label>
            <Button aria-pressed={myTasksOnly} className={`h-10 rounded-xl border-[#e5e9e3] bg-white text-xs ${myTasksOnly ? 'bg-[#edf3ee] text-[#4f7459]' : 'text-[#536158]'}`} onClick={() => onMyTasksChange(!myTasksOnly)} variant="outline">{myTasksOnly ? 'My tasks only' : 'Everyone'}</Button>
            {canEditWorkspace(user.role) && <Button asChild className="h-10 rounded-lg bg-[#245d43] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#174638] focus-visible:ring-2 focus-visible:ring-[#79a18a]"><Link href="/worklist?newTask=1">+ Create task</Link></Button>}
        </div>
    </header>
)

const DashboardReports = ({ items, lists, metrics }: Readonly<{
    items: ReturnType<typeof useDashboardData>['scopedItems']
    lists: ReturnType<typeof useDashboardData>['scopedLists']
    metrics: ReturnType<typeof useDashboardData>['metrics']
}>): ReactElement => {
    const trackedMinutes = items.reduce((total, item) => total + (item.timeSpentMinutes ?? 0), 0)
    const budgetMinutes = lists.reduce((total, list) => total + (list.settings.budgetMinutes ?? 0), 0)
    const progress = metrics.total ? Math.round((metrics.completed / metrics.total) * 100) : 0
    return <section aria-label="Workspace reports" className="mt-7 rounded-2xl border border-[#e7e9e5] bg-white p-4 shadow-[0_12px_32px_-28px_rgba(23,33,28,.4)] sm:p-5" id="reports">
        <header className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.13em] text-[#527c5d]">Workspace reports</p><h2 className="mt-1 text-sm font-semibold text-[#344138]">Progress and time</h2><p className="mt-1 text-[11px] text-[#87928a]">Calculated from tasks and budgets saved in this workspace.</p></div><Link className="text-[11px] font-semibold text-[#326b4d] transition-colors hover:text-[#174638]" href="/worklist">Open detailed worklist →</Link></header>
        <div className="grid gap-4 md:grid-cols-[1.2fr_1fr_1fr]">
            <article className="rounded-xl bg-[#fafbf9] p-4"><div className="flex items-center justify-between text-[11px]"><span className="text-[#77837b]">Tasks completed</span><strong className="tabular-nums text-[#354239]">{metrics.completed} / {metrics.total}</strong></div><div aria-label={`Task completion ${progress}%`} className="mt-3 h-2 overflow-hidden rounded-full bg-[#e9ede8]"><span className="block h-full rounded-full bg-[#79a18a]" style={{ width: `${progress}%` }} /></div><p className="mt-2 text-[10px] text-[#87928a]">{progress}% of saved tasks</p></article>
            <article className="rounded-xl bg-[#fafbf9] p-4"><span className="block text-[11px] text-[#77837b]">Time tracked</span><strong className="mt-2 block text-xl font-semibold tabular-nums text-[#354239]">{(trackedMinutes / 60).toFixed(1)}h</strong><p className="mt-1 text-[10px] text-[#87928a]">Across {items.length} tasks</p></article>
            <article className="rounded-xl bg-[#fafbf9] p-4"><span className="block text-[11px] text-[#77837b]">List budgets</span><strong className="mt-2 block text-xl font-semibold tabular-nums text-[#354239]">{budgetMinutes ? `${(trackedMinutes / 60).toFixed(1)} / ${(budgetMinutes / 60).toFixed(1)}h` : 'Not set'}</strong><div className="mt-2 flex items-center gap-1.5 text-[10px] text-[#87928a]">{metrics.statuses.map(({ name, count }) => <span aria-label={`${name}: ${count}`} className="h-1.5 rounded-full" key={name} style={{ backgroundColor: statusColor(name), flex: count }} title={`${name}: ${count}`} />)}</div></article>
        </div>
    </section>
}

const DashboardConnectionState = ({ error, loading }: Readonly<{ error: string; loading: boolean }>): ReactElement => (
    <main className="grid min-h-screen place-items-center bg-[#f3f5f1] px-5 text-sm text-[#68736b]">
        {error ? <section className="w-full max-w-lg rounded-2xl border border-rose-200 bg-white p-7 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-rose-700">Dashboard unavailable</p><h1 className="mt-2 text-2xl font-semibold text-[#17211c]">Could not load your workspace</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">{error}</p><button className="mt-4 text-sm font-medium text-emerald-700 underline" onClick={() => window.location.reload()} type="button">Try again</button>
        </section> : <div className="flex items-center gap-3 rounded-2xl border border-[#e1e6dd] bg-white px-5 py-4 shadow-sm"><span className="grid size-8 place-items-center rounded-lg bg-[#243b2c] text-sm font-bold text-[#c7f36b]">W</span><span>{loading ? 'Connecting to your workspace…' : 'Redirecting to sign in…'}</span></div>}
    </main>
)

const DashboardLoading = (): ReactElement => <div className="grid min-h-72 place-items-center rounded-2xl border border-[#e0e5dd] bg-white text-sm text-[#718076"><span className="flex items-center gap-3"><span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-[#dce5d6] border-t-[#668356]" />Loading your dashboard…</span></div>
