'use client'

import { useEffect, useState, type ReactElement } from 'react'
import { fetchOperationsLogs, type OperationsLogsPage } from '../operations-api'

type Outcome = 'all' | 'success' | 'errors' | 'slow'
type Trace = OperationsLogsPage['logs'][number]

const panel = 'rounded-2xl border border-[#e3e9e2] bg-white shadow-[0_12px_32px_-28px_rgba(23,33,28,.4)]'
const filters: ReadonlyArray<Readonly<{ value: Outcome; label: string }>> = [
    { value: 'all', label: 'All' },
    { value: 'success', label: 'Success (2xx)' },
    { value: 'errors', label: 'Errors' },
    { value: 'slow', label: 'Slow (>250ms)' }
]

const statusTone = (status: number): string =>
    status >= 500 ? 'bg-rose-50 text-rose-800' : status >= 400 ? 'bg-amber-50 text-amber-800' : 'bg-[#edf5ed] text-[#387451]'

const TraceDetails = ({ trace }: Readonly<{ trace: Trace }>): ReactElement => (
    <div className="grid gap-3 rounded-xl bg-[#f7f9f6] p-3 text-xs sm:grid-cols-2">
        <Detail label="Request ID" value={trace.requestId} />
        <Detail label="Trace ID" value={trace.traceId ?? 'Not available for this request'} />
        <Detail label="Span ID" value={trace.spanId ?? 'Not available for this request'} />
        <Detail label="User ID" value={trace.userId ?? 'Anonymous request'} />
        <p className="text-[#718076] sm:col-span-2">Use the request ID to find this call in Central log search. When a trace ID is present, use it to correlate distributed spans in your configured OpenTelemetry backend.</p>
    </div>
)

const Detail = ({ label, value }: Readonly<{ label: string; value: string }>): ReactElement => (
    <div className="min-w-0"><span className="block text-[10px] uppercase tracking-wide text-[#87948a]">{label}</span><code className="mt-1 block break-all text-[#40564a]">{value}</code></div>
)

export const OperationsTraceViewer = (): ReactElement => {
    const [search, setSearch] = useState('')
    const [outcome, setOutcome] = useState<Outcome>('all')
    const [page, setPage] = useState<OperationsLogsPage>({ logs: [], nextBefore: null })
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    useEffect(() => {
        let active = true
        const load = async (initial: boolean): Promise<void> => {
            if (initial) setLoading(true)
            else setRefreshing(true)
            try {
                const result = await fetchOperationsLogs({ search: search.trim(), level: 'all', outcome })
                if (active) { setPage(result); setError('') }
            } catch (cause) {
                if (active) setError(cause instanceof Error ? cause.message : 'Request traces could not be loaded.')
            } finally {
                if (active) { setLoading(false); setRefreshing(false) }
            }
        }
        const initialTimer = window.setTimeout(() => void load(true), 200)
        const refreshTimer = window.setInterval(() => void load(false), 15_000)
        return () => { active = false; window.clearTimeout(initialTimer); window.clearInterval(refreshTimer) }
    }, [outcome, search])

    const loadMore = async (): Promise<void> => {
        if (!page.nextBefore || refreshing) return
        try {
            const next = await fetchOperationsLogs({ search: search.trim(), level: 'all', outcome, before: page.nextBefore })
            setPage((current) => ({ logs: [...current.logs, ...next.logs], nextBefore: next.nextBefore }))
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'Older traces could not be loaded.') }
    }

    return <section aria-label="Live request traceability" className={`${panel} mt-5 overflow-hidden`}>
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#edf0ec] px-4 py-4 sm:px-5">
            <div><p className="text-[10px] font-semibold uppercase tracking-[.13em] text-[#668071]">Traceability</p><h2 className="mt-1 text-sm font-semibold">Live request traces</h2><p className="mt-1 text-[11px] text-[#88958b]">Find a request, inspect its IDs, route, result and duration. {refreshing ? 'Refreshing…' : 'Refreshes every 15 seconds.'}</p></div>
            <label className="sr-only" htmlFor="operations-trace-search">Search traces</label>
            <input autoComplete="off" className="h-9 w-full rounded-lg border border-[#dfe6dd] px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-[#668356] sm:w-72" id="operations-trace-search" maxLength={120} onChange={(event) => setSearch(event.target.value)} placeholder="Search trace ID, request ID, route…" value={search} />
        </header>
        <div aria-label="Filter request traces" className="flex flex-wrap gap-2 border-b border-[#edf0ec] px-4 py-3 sm:px-5" role="group">
            {filters.map((filter) => <button aria-pressed={outcome === filter.value} className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${outcome === filter.value ? 'border-[#b8cdb8] bg-[#edf5ed] text-[#315e40]' : 'border-[#e3e9e2] text-[#718076] hover:bg-[#f7f9f6]'}`} key={filter.value} onClick={() => setOutcome(filter.value)} type="button">{filter.label}</button>)}
            <span className="ml-auto self-center text-[10px] text-[#87948a]">{page.logs.length} traces loaded</span>
        </div>
        {error && <p className="m-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-800" role="alert">{error}</p>}
        <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-xs">
                <thead className="bg-[#fafbf9] text-[10px] uppercase tracking-wide text-[#78877c]"><tr><th className="px-4 py-3 font-semibold sm:px-5">Trace / Request ID</th><th className="px-4 py-3 font-semibold">Timestamp</th><th className="px-4 py-3 font-semibold">Method &amp; route</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 text-right font-semibold sm:px-5">Latency</th></tr></thead>
                <tbody className="divide-y divide-[#edf0ec]">
                    {page.logs.map((trace) => <TraceRow expanded={expandedId === trace.id} key={trace.id} onToggle={() => setExpandedId((current) => current === trace.id ? null : trace.id)} trace={trace} />)}
                    {!page.logs.length && <tr><td className="px-5 py-9 text-center text-xs text-[#89948b]" colSpan={5}>{loading ? 'Loading request traces…' : 'No traces match this filter or search.'}</td></tr>}
                </tbody>
            </table>
        </div>
        {page.nextBefore && <div className="border-t border-[#edf0ec] p-3 text-center"><button className="rounded-lg border border-[#dfe6dd] px-3 py-2 text-xs font-medium text-[#53645a] hover:bg-[#f8faf7] disabled:opacity-50" disabled={refreshing} onClick={() => void loadMore()} type="button">Load older traces</button></div>}
    </section>
}

const TraceRow = ({ trace, expanded, onToggle }: Readonly<{ trace: Trace; expanded: boolean; onToggle: () => void }>): ReactElement => <>
    <tr className="hover:bg-[#fbfcfa]">
        <td className="px-4 py-3 sm:px-5"><button aria-expanded={expanded} className="max-w-56 text-left font-mono text-[10px] text-[#315e40] underline-offset-2 hover:underline" onClick={onToggle} type="button">{trace.traceId ?? trace.requestId}</button><span className="mt-1 block text-[9px] text-[#87948a]">{trace.traceId ? 'Trace ID' : 'Request ID'}</span></td>
        <td className="whitespace-nowrap px-4 py-3 text-[#77867b]"><time dateTime={trace.createdAt}>{new Date(trace.createdAt).toLocaleString()}</time></td>
        <td className="px-4 py-3 font-mono text-[11px] text-[#40564a]">{trace.method} {trace.route}</td>
        <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusTone(trace.statusCode)}`}>{trace.statusCode}</span></td>
        <td className="px-4 py-3 text-right tabular-nums text-[#53645a] sm:px-5">{trace.durationMs} ms</td>
    </tr>
    {expanded && <tr><td className="px-4 pb-4 sm:px-5" colSpan={5}><TraceDetails trace={trace} /></td></tr>}
</>
