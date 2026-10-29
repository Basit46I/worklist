'use client'

import { useCallback, useEffect, useState, type ReactElement } from 'react'
import Link from 'next/link'
import { Activity, AlertTriangle, ArrowLeft, Clock3, Cpu, Database, RefreshCw, Server } from 'lucide-react'
import { fetchOperationsSnapshot, type OperationsSnapshot } from '../operations-api'
import { OperationsLogViewer } from './operations-log-viewer'

const panel = 'rounded-2xl border border-[#e3e9e2] bg-white shadow-[0_12px_32px_-28px_rgba(23,33,28,.4)]'
const formatBytes = (bytes: number): string => `${(bytes / 1024 / 1024).toFixed(1)} MB`
const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
}

export const OperationsDashboard = (): ReactElement => {
    const [snapshot, setSnapshot] = useState<OperationsSnapshot | null>(null)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

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
        return () => {
            window.clearTimeout(initialRefresh)
            window.clearInterval(timer)
        }
    }, [refresh])

    return (
        <main className="min-h-screen bg-[#f5f7f3] px-4 py-5 text-[#263b31] sm:px-8 sm:py-8">
            <div className="mx-auto max-w-6xl">
                <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#174638] text-white"><Activity aria-hidden="true" className="size-5" /></span><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#668071]">Worklist / Operations</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Service health</h1></div></div>
                    <div className="flex items-center gap-2"><Link className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dfe6dd] bg-white px-3 text-xs font-medium text-[#53645a] hover:bg-[#f8faf7]" href="/dashboard"><ArrowLeft aria-hidden="true" className="size-4" />Workspace</Link><button aria-label="Refresh metrics" className="grid size-10 place-items-center rounded-xl border border-[#dfe6dd] bg-white text-[#53645a] hover:bg-[#f8faf7] disabled:opacity-60" disabled={refreshing} onClick={() => void refresh()} type="button"><RefreshCw aria-hidden="true" className={`size-4 ${refreshing ? 'animate-spin' : ''}`} /></button></div>
                </header>

                {error && <section className={`${panel} mb-5 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900`} role="alert"><strong className="block">Metrics unavailable</strong><span className="mt-1 block">{error}</span></section>}
                {snapshot && <>
                    <section aria-label="Active alerts" className={`${panel} mb-5 overflow-hidden`}>
                        <div className="border-b border-[#edf0ec] px-4 py-4 sm:px-5"><p className="text-[10px] font-semibold uppercase tracking-[.13em] text-[#668071]">Attention</p><h2 className="mt-1 text-sm font-semibold">Active alerts</h2></div>
                        {snapshot.metrics.alerts.length ? <ul className="divide-y divide-[#edf0ec]">{snapshot.metrics.alerts.map((alert) => <li className="flex items-start gap-3 px-4 py-3 sm:px-5" key={alert.id}><span aria-hidden="true" className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg ${alert.severity === 'critical' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}><AlertTriangle className="size-4" /></span><span><strong className="block text-xs font-semibold">{alert.title}</strong><span className="mt-1 block text-xs text-[#728076]">{alert.detail}</span></span><span className={`ml-auto rounded-full px-2 py-1 text-[9px] font-semibold uppercase ${alert.severity === 'critical' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{alert.severity}</span></li>)}</ul> : <p className="px-4 py-4 text-xs text-[#728076] sm:px-5">No threshold alerts are active on this function instance.</p>}
                    </section>
                    <section aria-label="Service status" className={`${panel} mb-5 grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4`}>
                        <HealthItem icon={Server} label="API" value="Healthy" healthy />
                        <HealthItem icon={Database} label="Database" value={snapshot.health.database === 'available' ? 'Connected' : 'Unavailable'} healthy={snapshot.health.database === 'available'} />
                        <HealthItem icon={Cpu} label="Runtime" value={`Node ${snapshot.metrics.nodeVersion.replace(/^v/, '')}`} healthy />
                        <HealthItem icon={Activity} label="Trace / fleet export" value={snapshot.telemetry.otlpExportConfigured ? 'OTLP configured' : 'Not configured'} healthy={snapshot.telemetry.otlpExportConfigured} />
                    </section>

                    <section aria-label="API performance metrics" className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <MetricCard icon={Activity} label="Requests captured" value={snapshot.metrics.requests.total.toLocaleString()} detail="This function instance" />
                        <MetricCard icon={AlertTriangle} label="4xx / 5xx responses" value={snapshot.metrics.requests.errors.toLocaleString()} detail="Client and server errors" warn={snapshot.metrics.requests.errors > 0} />
                        <MetricCard icon={Clock3} label="Average response" value={`${snapshot.metrics.requests.averageLatencyMs} ms`} detail="Observed request duration" />
                        <MetricCard icon={Cpu} label="Process memory" value={formatBytes(snapshot.metrics.memory.rssBytes)} detail={`Heap ${formatBytes(snapshot.metrics.memory.heapUsedBytes)} used`} />
                    </section>

                    <section aria-label="API route activity" className={`${panel} overflow-hidden`}>
                        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#edf0ec] px-4 py-4 sm:px-5"><div><p className="text-[10px] font-semibold uppercase tracking-[.13em] text-[#668071]">API activity</p><h2 className="mt-1 text-sm font-semibold">Requests by route</h2><p className="mt-1 text-[11px] text-[#88958b]">Counts and average duration since this instance started.</p></div><p className="text-[11px] text-[#77867b]">Uptime {formatUptime(snapshot.metrics.uptimeSeconds)}</p></div>
                        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-[#fafbf9] text-[10px] uppercase tracking-wide text-[#78877c]"><tr><th className="px-5 py-3 font-semibold">Route</th><th className="px-4 py-3 font-semibold">Method</th><th className="px-4 py-3 text-right font-semibold">Requests</th><th className="px-4 py-3 text-right font-semibold">Errors</th><th className="px-4 py-3 text-right font-semibold">Error rate</th><th className="px-4 py-3 text-right font-semibold">Avg.</th><th className="px-5 py-3 text-right font-semibold">P95</th></tr></thead><tbody className="divide-y divide-[#edf0ec]">{snapshot.metrics.requests.routes.length ? snapshot.metrics.requests.routes.map((route) => <tr key={`${route.method}:${route.route}`}><td className="px-5 py-3 font-mono text-[#34483a]">{route.route}</td><td className="px-4 py-3 text-[#6f7e73]">{route.method}</td><td className="px-4 py-3 text-right tabular-nums">{route.requests.toLocaleString()}</td><td className={`px-4 py-3 text-right tabular-nums ${route.errors ? 'font-semibold text-rose-700' : 'text-[#6f7e73]'}`}>{route.errors}</td><td className={`px-4 py-3 text-right tabular-nums ${route.errorRatePercent >= 5 ? 'font-semibold text-rose-700' : 'text-[#6f7e73]'}`}>{route.errorRatePercent}%</td><td className="px-4 py-3 text-right tabular-nums">{route.averageLatencyMs} ms</td><td className="px-5 py-3 text-right tabular-nums">{route.p95LatencyMs} ms</td></tr>) : <tr><td className="px-5 py-8 text-center text-[#89948b]" colSpan={7}>{loading ? 'Loading API activity…' : 'No completed requests captured yet.'}</td></tr>}</tbody></table></div>
                    </section>

                    <OperationsLogViewer />

                    <p className="mt-4 rounded-xl border border-[#e4e9e2] bg-[#eef2ec] px-4 py-3 text-[11px] leading-5 text-[#64736a]">These metrics describe the <strong className="font-semibold text-[#40564a]">current function instance</strong>. Vercel may serve requests through multiple instances, so this page is not a fleet-wide total. Prometheus scraping is available at <code className="rounded bg-white px-1.5 py-0.5">/api/metrics</code> when a bearer token is configured. Last refreshed {new Date(snapshot.metrics.generatedAt).toLocaleTimeString()}.</p>
                </>}
                {!snapshot && loading && <div className={`${panel} grid min-h-56 place-items-center text-sm text-[#77867b]`}><span className="flex items-center gap-3"><span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-[#dce5d6] border-t-[#668356]" />Loading protected service metrics…</span></div>}
            </div>
        </main>
    )
}

const HealthItem = ({ icon: Icon, label, value, healthy }: Readonly<{ icon: typeof Server; label: string; value: string; healthy: boolean }>): ReactElement => <div className="flex items-center gap-3"><span className={`grid size-10 place-items-center rounded-xl ${healthy ? 'bg-[#edf5ed] text-[#387451]' : 'bg-rose-50 text-rose-700'}`}><Icon aria-hidden="true" className="size-4" /></span><span><span className="block text-[10px] text-[#87948a]">{label}</span><strong className="mt-1 block text-sm font-semibold">{value}</strong></span><span className={`ml-auto size-2 rounded-full ${healthy ? 'bg-[#67a277]' : 'bg-rose-500'}`} /></div>

const MetricCard = ({ icon: Icon, label, value, detail, warn = false }: Readonly<{ icon: typeof Activity; label: string; value: string; detail: string; warn?: boolean }>): ReactElement => <article className={`${panel} p-4`}><div className="flex items-center justify-between"><span className="text-[11px] text-[#7d8b81]">{label}</span><Icon aria-hidden="true" className={`size-4 ${warn ? 'text-amber-700' : 'text-[#70917a]'}`} /></div><strong className="mt-3 block text-2xl font-semibold tracking-tight tabular-nums">{value}</strong><span className="mt-1 block text-[10px] text-[#929d94]">{detail}</span></article>
