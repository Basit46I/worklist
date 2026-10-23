'use client'

import { useEffect, useState, type SubmitEvent, type ReactElement } from 'react'
import { Button } from '@workspace/ui/primitives'
import type { WorklistComment, WorklistCommentClient } from '../model/index.js'

export const WorkItemComments = ({
    itemId,
    canComment,
    refreshSequence,
    refreshItemId,
    commentClient
}: Readonly<{
    itemId: string
    canComment: boolean
    refreshSequence: number
    refreshItemId: string | null
    commentClient: WorklistCommentClient
}>): ReactElement => {
    const [comments, setComments] = useState<readonly WorklistComment[]>([])
    const [draft, setDraft] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        let active = true
        void commentClient
            .list(itemId)
            .then((rows) => {
                if (active) {
                    setComments(rows)
                    setError('')
                }
            })
            .catch((cause: unknown) => {
                if (active) setError(cause instanceof Error ? cause.message : 'Could not load comments.')
            })
            .finally(() => {
                if (active) setLoading(false)
            })
        return () => {
            active = false
        }
    }, [commentClient, itemId])

    useEffect(() => {
        if (refreshSequence === 0 || (refreshItemId !== null && refreshItemId !== itemId)) return
        let active = true
        void commentClient
            .list(itemId)
            .then((rows) => {
                if (active) {
                    setComments(rows)
                    setError('')
                }
            })
            .catch((cause: unknown) => {
                if (active) setError(cause instanceof Error ? cause.message : 'Could not refresh comments.')
            })
        return () => {
            active = false
        }
    }, [commentClient, itemId, refreshItemId, refreshSequence])

    const submit = (event: SubmitEvent<HTMLFormElement>): void => {
        event.preventDefault()
        if (!draft.trim() || saving) return
        setSaving(true)
        void commentClient
            .create(itemId, draft)
            .then((comment) => {
                setComments((current) => [...current, comment])
                setDraft('')
                setError('')
            })
            .catch((cause: unknown) => {
                setError(cause instanceof Error ? cause.message : 'Could not add comment.')
            })
            .finally(() => {
                setSaving(false)
            })
    }

    return (
        <section aria-label="Task comments" className="mt-3 border-t border-slate-100 pt-3 sm:col-span-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">Comments</h3>
            {loading ? (
                <p className="mt-2 text-sm text-slate-500">Loading comments…</p>
            ) : comments.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No comments yet.</p>
            ) : (
                <ol className="mt-2 space-y-2">
                    {comments.map((comment) => (
                        <li className="rounded-lg bg-slate-50 px-3 py-2" key={comment.id}>
                            <p className="whitespace-pre-wrap text-sm text-slate-700">{comment.body}</p>
                            <p className="mt-1 text-xs text-slate-400">
                                {comment.authorName} ·{' '}
                                {new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(comment.createdAt))}
                            </p>
                        </li>
                    ))}
                </ol>
            )}
            {error && <p className="mt-2 text-sm text-rose-700" role="alert">{error}</p>}
            {canComment && (
                <form className="mt-2 flex items-start gap-2" onSubmit={submit}>
                    <textarea
                        aria-label="Add a comment"
                        className="min-h-16 min-w-32 flex-1 rounded-md border border-slate-200 bg-white p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        maxLength={2000}
                        onChange={(event) => {
                            setDraft(event.target.value)
                        }}
                        placeholder="Write a comment…"
                        value={draft}
                    />
                    <Button className="h-8" disabled={saving || !draft.trim()} type="submit">
                        {saving ? 'Posting…' : 'Comment'}
                    </Button>
                </form>
            )}
        </section>
    )
}
