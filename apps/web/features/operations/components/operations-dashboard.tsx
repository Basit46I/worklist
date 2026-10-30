'use client'

import { useCallback, useEffect, useState, type ReactElement } from 'react'
import Link from 'next/link'
import { Activity, AlertTriangle, ArrowLeft, Check, Clock3, Cpu, Database, Gauge, RefreshCw, Server, ShieldCheck, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { fetchOperationsSnapshot, type OperationsSnapshot } from '../operations-api'
import { OperationsLogViewer } from './operations-log-viewer'
import { OperationsTraceViewer } from './operations-trace-viewer'

const panel = 'rounded-2xl border border-[#e2e8e1] bg-white shadow-[0_14px_40px_-32px_rgba(27,48,36,.4)]'
const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'api-performance', label: 'API performance' },
    { id: 'request-traces', label: 'Traceability' },
    { id: 'central-logs', label: 'Logs' }
] as const
const formatBytes = (bytes: number): string => `${(bytes / 1024 / 1024).toFixed(1)} MB`
const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
}
const errorRate = (errors: number, total: number): string => total ? `${((errors / total) * 100).toFixed(1)}%` : '0.0%'

export const OperationsDashboard = (): ReactElement => {
    const [snapshot, setSnapshot] = useState<OperationsSnapshot | null>(null)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [activeSection, setActiveSection] = useState<(typeof sections)[number]['id']>('overview')

    const refresh = useCallback(async () => {
        setRefreshing(true)
        try {
            setSnapshot(await fetchOperationsSnapshot())
            setError('')
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Operations data is unavailable.')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => {
        const initialRefresh = window.setTimeout(() => void refresh(), 0)
        const timer = window.setInterval(() => void refresh(), 15_000)
        return () => { window.clearTimeout(initialRefresh); window.clearInterval(timer) }
    }, [refresh])

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            const visible = entries.filter((entry) => entry.isIntersecting).sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0]
            if (visible?.target.id) setActiveSection(visible.target.id as (typeof sections)[number]['id'])
        }, { rootMargin: '-18% 0px -68% 0px', threshold: [0, 0.15, 0.4, 0.7] })
        sections.forEach(({ id }) => {
            const target = document.getElementById(id)
            if (target) observer.observe(target)
        })
        return () => observer.disconnect()
    }, [])

    return (
        <main className="min-h-screen bg-[#f3f6f2] px-4 py-5 text-[#263b31] sm:px-7 sm:py-7 xl:px-10">
            <div className="mx-auto max-w-[1440px]">
                <header className="sticky top-0 z-40 -mx-4 -mt-5 mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-[#e2e8e1]/90 bg-[#f3f6f2]/95 px-4 pb-4 pt-5 backdrop-blur-md sm:-mx-7 sm:-mt-7 sm:px-7 sm:pt-6 xl:-mx-10 xl:px-10">
                    <div className="flex items-center gap-3">
                        <span className="grid size-10 place-items-center rounded-xl bg-[#174638] text-white shadow-sm"><Activity aria-hidden="true" className="size-5" /></span>
                        <div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#668071]">Worklist <span className="px-1 text-[#bac5bb]">/</span> Operations</p><p className="mt-0.5 text-sm font-semibold tracking-tight">Observability</p></div>
                    </div>
                    <div className="flex items-center gap-2">
                        <nav aria-label="Operations sections" className="mr-2 hidden items-center gap-1 rounded-xl border border-[#e2e8e1] bg-white p-1 md:flex">
                            {sections.map(({ id, label }) => <a aria-current={activeSection === id ? 'location' : undefined} className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${activeSection === id ? 'bg-[#edf4ec] font-semibold text-[#315e40]' : 'text-[#738077] hover:bg-[#f5f8f4] hover:text-[#315e40]'}`} href={`#${id}`} key={id} onClick={() => setActiveSection(id)}>{label}</a>)}
                        </nav>
                        <Link className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dfe6dd] bg-white px-3 text-xs font-medium text-[#53645a] transition hover:bg-[#f8faf7]" href="/dashboard"><ArrowLeft aria-hidden="true" className="size-4" />Workspace</Link>
                        <button aria-label="Refresh metrics" className="grid size-10 place-items-center rounded-xl border border-[#dfe6dd] bg-white text-[#53645a] transition hover:bg-[#f8faf7] disabled:opacity-60" disabled={refreshing} onClick={() => void refresh()} type="button"><RefreshCw aria-hidden="true" className={`size-4 ${refreshing ? 'animate-spin' : ''}`} /></button>
                    </div>
                </header>

                <section className="mb-6 flex scroll-mt-32 flex-wrap items-end justify-between gap-4" id="overview">
                    <div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#6e8b73]">Operations center</p><h1 className="mt-1 text-3xl font-semibold tracking-[-.04em] text-[#1d3328] sm:text-[34px]">Service overview</h1><p className="mt-2 max-w-2xl text-sm text-[#78867b]">See API traffic, performance, errors and request details in one place.</p></div>
                    {snapshot && <span className="inline-flex items-center gap-2 rounded-full border border-[#dce7dc] bg-white px-3 py-2 text-[11px] font-medium text-[#637568]"><span className="size-2 rounded-full bg-[#5a9a68]" />Updated {new Date(snapshot.metrics.generatedAt).toLocaleTimeString()}</span>}
                </section>

                {error && <section className={`${panel} mb-5 flex items-start gap-3 border-rose-200 bg-rose-50 p-4 text-sm text-rose-900`} role="alert"><AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><span><strong className="block">Metrics unavailable</strong><span className="mt-1 block">{error}</span></span></section>}
                {snapshot && <>
                    <section aria-label="Service health" className="mb-5 grid overflow-hidden rounded-2xl border border-[#dfe7df] bg-white shadow-[0_14px_40px_-32px_rgba(27,48,36,.4)] sm:grid-cols-2 xl:grid-cols-4">
                        <HealthItem icon={ShieldCheck} label="API service" value="Operational" healthy />
                        <HealthItem icon={Database} label="Database" value={snapshot.health.database === 'available' ? 'Connected' : 'Unavailable'} healthy={snapshot.health.database === 'available'} />
                        <HealthItem icon={Cpu} label="Runtime" value={`Node ${snapshot.metrics.nodeVersion.replace(/^v/, '')}`} healthy />
                        <HealthItem icon={Activity} label="OpenTelemetry" value={snapshot.telemetry.otlpExportConfigured ? 'Export configured' : 'Not configured'} healthy={snapshot.telemetry.otlpExportConfigured} />
                    </section>

                    <section aria-label="Key performance indicators" className="mb-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                        <MetricCard icon={Activity} label="Requests captured" value={snapshot.metrics.requests.total.toLocaleString()} detail="Since this instance started" />
                        <MetricCard icon={AlertTriangle} label="Error responses" value={snapshot.metrics.requests.errors.toLocaleString()} detail={`${snapshot.metrics.requests.serverErrors.toLocaleString()} server errors`} warn={snapshot.metrics.requests.errors > 0} />
                        <MetricCard icon={Gauge} label="Error rate" value={errorRate(snapshot.metrics.requests.errors, snapshot.metrics.requests.total)} detail="4xx and 5xx responses" warn={snapshot.metrics.requests.errors > 0} />
                        <MetricCard icon={Clock3} label="Average latency" value={`${snapshot.metrics.requests.averageLatencyMs} ms`} detail="Across captured requests" />
                        <MetricCard icon={Zap} label="Instance uptime" value={formatUptime(snapshot.metrics.uptimeSeconds)} detail={`Memory ${formatBytes(snapshot.metrics.memory.rssBytes)}`} />
                    </section>

                    <div className="mb-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,.8fr)]">
                        <section aria-label="API route performance" className={`${panel} scroll-mt-32 overflow-hidden`} id="api-performance">
                            <SectionHeading eyebrow="Performance" title="Endpoint performance" description="Request volume, errors and response time by route." aside={`Uptime ${formatUptime(snapshot.metrics.uptimeSeconds)}`} />
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[760px] text-left text-xs">
                                    <thead className="bg-[#f8faf7] text-[10px] uppercase tracking-[.1em] text-[#78877c]"><tr><th className="px-5 py-3 font-semibold">Endpoint</th><th className="px-4 py-3 text-right font-semibold">Requests</th><th className="px-4 py-3 text-right font-semibold">Errors</th><th className="px-4 py-3 text-right font-semibold">Error rate</th><th className="px-4 py-3 text-right font-semibold">Average</th><th className="px-5 py-3 text-right font-semibold">P95</th></tr></thead>
                                    <tbody className="divide-y divide-[#edf0ec]">
                                        {snapshot.metrics.requests.routes.length ? snapshot.metrics.requests.routes.map((route) => <tr className="transition-colors hover:bg-[#fbfcfa]" key={`${route.method}:${route.route}`}>
                                            <td className="px-5 py-3.5"><code className="rounded-md bg-[#f3f6f2] px-2 py-1 text-[10px] font-medium text-[#3b5544]">{route.method}</code><span className="ml-2 font-mono text-[11px] text-[#34483a]">{route.route}</span></td>
                                            <td className="px-4 py-3.5 text-right tabular-nums text-[#40564a]">{route.requests.toLocaleString()}</td>
                                            <td className={`px-4 py-3.5 text-right tabular-nums ${route.errors ? 'font-semibold text-rose-700' : 'text-[#6f7e73]'}`}>{route.errors.toLocaleString()}</td>
                                            <td className="px-4 py-3.5 text-right tabular-nums"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${route.errorRatePercent >= 5 ? 'bg-rose-50 text-rose-700' : route.errorRatePercent > 0 ? 'bg-amber-50 text-amber-800' : 'bg-[#eff5ef] text-[#4d7655]'}`}>{route.errorRatePercent}%</span></td>
                                            <td className="px-4 py-3.5 text-right tabular-nums text-[#53645a]">{route.averageLatencyMs} ms</td>
                                            <td className="px-5 py-3.5 text-right tabular-nums text-[#53645a]">{route.p95LatencyMs} ms</td>
                                        </tr>) : <tr><td className="px-5 py-10 text-center text-[#89948b]" colSpan={6}>{loading ? 'Loading endpoint activity…' : 'No completed requests captured on this instance yet.'}</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section aria-label="Active alerts" className={`${panel} overflow-hidden`}>
                            <SectionHeading eyebrow="Attention" title="Active alerts" description="Signals that may need a closer look." />
                            {snapshot.metrics.alerts.length ? <ul className="divide-y divide-[#edf0ec]">{snapshot.metrics.alerts.map((alert) => <li className="flex items-start gap-3 px-4 py-4" key={alert.id}><span aria-hidden="true" className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl ${alert.severity === 'critical' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}><AlertTriangle className="size-4" /></span><span className="min-w-0"><strong className="block text-xs font-semibold text-[#34483a]">{alert.title}</strong><span className="mt-1.5 block text-[11px] leading-5 text-[#728076]">{alert.detail}</span></span><span className={`ml-auto rounded-full px-2 py-1 text-[9px] font-semibold uppercase ${alert.severity === 'critical' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{alert.severity}</span></li>)}</ul> : <div className="px-5 py-7"><span className="grid size-9 place-items-center rounded-xl bg-[#eff5ef] text-[#4d7655]"><Check aria-hidden="true" className="size-4" /></span><p className="mt-3 text-xs font-semibold text-[#40564a]">No active alerts</p><p className="mt-1 text-[11px] leading-5 text-[#89948b]">No configured threshold has been crossed by this function instance.</p></div>}
                            <div className="border-t border-[#edf0ec] px-5 py-3 text-[10px] text-[#87948a]">Process memory · RSS {formatBytes(snapshot.metrics.memory.rssBytes)} · Heap {formatBytes(snapshot.metrics.memory.heapUsedBytes)} / {formatBytes(snapshot.metrics.memory.heapTotalBytes)}</div>
                        </section>
                    </div>

                    <div className="scroll-mt-32" id="request-traces"><OperationsTraceViewer /></div>
                    <div className="scroll-mt-32" id="central-logs"><OperationsLogViewer /></div>
                    <p className="mt-5 rounded-xl border border-[#e1e8df] bg-[#edf2eb] px-4 py-3 text-[11px] leading-5 text-[#64736a]">This view reports the <strong className="font-semibold text-[#40564a]">current function instance</strong>; Vercel may route requests across multiple instances. Prometheus metrics are available at <code className="rounded bg-white px-1.5 py-0.5">/api/metrics</code> when bearer authentication is configured. Last refreshed {new Date(snapshot.metrics.generatedAt).toLocaleTimeString()}.</p>
                </>}
                {!snapshot && loading && <div className={`${panel} grid min-h-64 place-items-center text-sm text-[#77867b]`}><span className="flex items-center gap-3"><span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-[#dce5d6] border-t-[#668356]" />Loading protected service metrics…</span></div>}
            </div>
        </main>
    )
}

const SectionHeading = ({ eyebrow, title, description, aside }: Readonly<{ eyebrow: string; title: string; description: string; aside?: string }>): ReactElement => <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#edf0ec] px-5 py-4"><div><p className="text-[9px] font-semibold uppercase tracking-[.15em] text-[#718b75]">{eyebrow}</p><h2 className="mt-1 text-sm font-semibold text-[#304538]">{title}</h2><p className="mt-1 text-[11px] text-[#88958b]">{description}</p></div>{aside && <span className="text-[10px] text-[#77867b]">{aside}</span>}</div>

const HealthItem = ({ icon: Icon, label, value, healthy }: Readonly<{ icon: LucideIcon; label: string; value: string; healthy: boolean }>): ReactElement => <div className="flex items-center gap-3 border-b border-[#edf0ec] px-4 py-4 last:border-b-0 sm:border-r sm:px-5 sm:last:border-r-0 xl:border-b-0"><span className={`grid size-9 shrink-0 place-items-center rounded-xl ${healthy ? 'bg-[#edf5ed] text-[#387451]' : 'bg-rose-50 text-rose-700'}`}><Icon aria-hidden="true" className="size-4" /></span><span className="min-w-0"><span className="block text-[10px] text-[#87948a]">{label}</span><strong className="mt-1 block truncate text-xs font-semibold text-[#34483a]">{value}</strong></span><span aria-label={healthy ? 'Available' : 'Unavailable'} className={`ml-auto size-2 shrink-0 rounded-full ${healthy ? 'bg-[#67a277]' : 'bg-rose-500'}`} /></div>

const MetricCard = ({ icon: Icon, label, value, detail, warn = false }: Readonly<{ icon: LucideIcon; label: string; value: string; detail: string; warn?: boolean }>): ReactElement => <article className={`${panel} p-4 transition-shadow hover:shadow-[0_18px_44px_-32px_rgba(27,48,36,.55)]`}><div className="flex items-center justify-between gap-2"><span className="text-[11px] font-medium text-[#748278]">{label}</span><span className={`grid size-8 place-items-center rounded-lg ${warn ? 'bg-amber-50 text-amber-700' : 'bg-[#eff5ef] text-[#62816a]'}`}><Icon aria-hidden="true" className="size-4" /></span></div><strong className="mt-3 block text-[26px] font-semibold tracking-[-.04em] text-[#263b31] tabular-nums">{value}</strong><span className="mt-1 block text-[10px] text-[#929d94]">{detail}</span></article>
