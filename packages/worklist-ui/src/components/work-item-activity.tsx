'use client'

import { useEffect, useRef, useState, type ReactElement } from 'react'
import type { WorkItemActivity, WorkItemActivityClient } from '../model/index.js'

export const WorkItemActivityFeed = ({ itemId, client, refreshSequence, refreshItemId }: Readonly<{ itemId: string; client: WorkItemActivityClient; refreshSequence: number; refreshItemId: string | null }>): ReactElement => {
    const [entries, setEntries] = useState<readonly WorkItemActivity[]>([])
    const [error, setError] = useState('')
    const hasLoaded = useRef(false)

    useEffect(() => {
        if (hasLoaded.current && refreshItemId !== null && refreshItemId !== itemId) return
        let active = true
        void client.list(itemId).then((result) => {
            if (active) { setEntries(result); setError(''); hasLoaded.current = true }
        }).catch((cause: unknown) => {
            if (active) { setError(cause instanceof Error ? cause.message : 'Could not load task history.'); hasLoaded.current = true }
        })
        return () => { active = false }
    }, [client, itemId, refreshItemId, refreshSequence])

    return <section aria-label="Task activity" className="mt-3 border-t border-slate-100 pt-3 sm:col-span-3">
        <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">Activity</h3>
        {error ? <p className="mt-2 text-sm text-rose-700" role="alert">{error}</p> : entries.length ? <ol className="mt-2 space-y-2">{entries.map((entry) => <li className="flex flex-wrap items-baseline gap-x-2 text-sm" key={entry.id}>
            <strong className="font-medium text-slate-700">{entry.actorName}</strong><span className="text-slate-600">{entry.summary}</span><time className="text-xs text-slate-400" dateTime={entry.createdAt}>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.createdAt))}</time>
        </li>)}</ol> : <p className="mt-2 text-sm text-slate-500">No activity yet.</p>}
    </section>
}
