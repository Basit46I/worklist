'use client'

import { useEffect, useState, type ReactElement } from 'react'
import { fetchOperationsLogs, type OperationsLogsPage } from '../operations-api'

const panel = 'rounded-2xl border border-[#e3e9e2] bg-white shadow-[0_12px_32px_-28px_rgba(23,33,28,.4)]'
type Level = 'all' | 'info' | 'warn' | 'error'

export const OperationsLogViewer = (): ReactElement => {
    const [search, setSearch] = useState('')
    const [level, setLevel] = useState<Level>('all')
    const [page, setPage] = useState<OperationsLogsPage>({ logs: [], nextBefore: null })
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    useEffect(() => {
        let active = true
        const load = async (initial: boolean): Promise<void> => {
            if (!active) return
            if (initial) setLoading(true)
            else setRefreshing(true)
            try {
                const result = await fetchOperationsLogs({ search: search.trim(), level })
                if (active) { setPage(result); setError('') }
            } catch (cause) {
                if (active) setError(cause instanceof Error ? cause.message : 'Logs could not be loaded.')
            } finally {
                if (active) { setLoading(false); setRefreshing(false) }
            }
        }
        const timer = window.setTimeout(() => {
            void load(true)
        }, 250)
        const refreshTimer = window.setInterval(() => {
            void load(false)
        }, 15_000)
        return () => { active = false; window.clearTimeout(timer); window.clearInterval(refreshTimer) }
    }, [search, level])

    const loadMore = async (): Promise<void> => {
        if (!page.nextBefore || refreshing) return
        try {
            const next = await fetchOperationsLogs({ search: search.trim(), level, before: page.nextBefore })
            setPage((current) => ({ logs: [...current.logs, ...next.logs], nextBefore: next.nextBefore }))
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'More logs could not be loaded.') }
    }

    return <section aria-label="Centralized API logs" className={`${panel} mt-5 overflow-hidden`}>
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#edf0ec] px-4 py-4 sm:px-5">
            <div><p className="text-[10px] font-semibold uppercase tracking-[.13em] text-[#668071]">Central log search</p><h2 className="mt-1 text-sm font-semibold">Recent API requests</h2><p className="mt-1 text-[11px] text-[#88958b]">Team-scoped records retained for 14 days. {refreshing ? 'Refreshing…' : 'Refreshes every 15 seconds.'}</p></div>
            <div className="flex flex-wrap gap-2"><label className="sr-only" htmlFor="operations-log-search">Search logs</label><input className="h-9 w-56 rounded-lg border border-[#dfe6dd] px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-[#668356]" id="operations-log-search" maxLength={120} onChange={(event) => setSearch(event.target.value)} placeholder="Search route, request ID, user…" value={search} /><label className="sr-only" htmlFor="operations-log-level">Log level</label><select className="h-9 rounded-lg border border-[#dfe6dd] bg-white px-3 text-xs" id="operations-log-level" onChange={(event) => setLevel(event.target.value as Level)} value={level}><option value="all">All levels</option><option value="info">Info</option><option value="warn">Warnings</option><option value="error">Errors</option></select></div>
        </div>
        {error && <p className="m-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-800" role="alert">{error}</p>}
        <div className="divide-y divide-[#edf0ec]">
            {page.logs.map((log) => {
                const expanded = expandedId === log.id
                return <article className="px-4 py-3 text-xs sm:px-5" key={log.id}>
                    <button aria-controls={`operations-log-details-${log.id}`} aria-expanded={expanded} className="grid w-full gap-2 text-left outline-none focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-[#668356] sm:grid-cols-[145px_65px_1fr]" onClick={() => setExpandedId((current) => current === log.id ? null : log.id)} type="button">
                        <time className="text-[#77867b]" dateTime={log.createdAt}>{new Date(log.createdAt).toLocaleString()}</time>
                        <span className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${log.level === 'error' ? 'bg-rose-50 text-rose-800' : log.level === 'warn' ? 'bg-amber-50 text-amber-800' : 'bg-[#edf5ed] text-[#387451]'}`}>{log.level}</span>
                        <div className="min-w-0"><p className="font-medium text-[#3c5043]">{log.method} {log.route} · {log.statusCode} · {log.durationMs} ms <span className="ml-1 text-[#87948a]">{expanded ? '− Hide details' : '+ Open details'}</span></p><p className="mt-1 break-all font-mono text-[10px] text-[#718076]">Request {log.requestId}{log.traceId ? ` · Trace ${log.traceId}` : ''}{log.userId ? ` · User ${log.userId}` : ''}</p></div>
                    </button>
                    {expanded && <div className="mt-3 grid gap-3 rounded-xl bg-[#f7f9f6] p-3 text-xs sm:grid-cols-2" id={`operations-log-details-${log.id}`}>
                        <LogDetail label="Request ID" value={log.requestId} />
                        <LogDetail label="Trace ID" value={log.traceId ?? 'Not available for this request'} />
                        <LogDetail label="Span ID" value={log.spanId ?? 'Not available for this request'} />
                        <LogDetail label="User ID" value={log.userId ?? 'Anonymous request'} />
                        {log.errorCode && <LogDetail label="Error code" value={log.errorCode} />}
                        {log.errorMessage
                            ? <div className="sm:col-span-2"><LogDetail label="Why this request failed" value={log.errorMessage} /></div>
                            : log.statusCode >= 400 && <p className="sm:col-span-2 text-[#8a5520]">No error reason was captured for this request. New requests will include the safe API error message here.</p>}
                    </div>}
                </article>
            })}
            {!page.logs.length && <p className="px-5 py-8 text-center text-xs text-[#89948b]">{loading ? 'Searching logs…' : 'No matching logs. New requests appear here when the database is connected.'}</p>}
        </div>
        {page.nextBefore && <div className="border-t border-[#edf0ec] p-3 text-center"><button className="rounded-lg border border-[#dfe6dd] px-3 py-2 text-xs font-medium text-[#53645a] hover:bg-[#f8faf7] disabled:opacity-50" disabled={refreshing} onClick={() => void loadMore()} type="button">Load older logs</button></div>}
    </section>
}

const LogDetail = ({ label, value }: Readonly<{ label: string; value: string }>): ReactElement => <div className="min-w-0"><span className="block text-[10px] uppercase tracking-wide text-[#87948a]">{label}</span><code className="mt-1 block break-all text-[#40564a]">{value}</code></div>
