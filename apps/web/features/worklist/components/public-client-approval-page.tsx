'use client'

import { useEffect, useState, type FormEvent, type ReactElement } from 'react'
import { CheckCircle2, ClipboardCheck } from 'lucide-react'
import { Button } from '@workspace/ui/primitives'
import { fetchClientApproval, submitClientApproval, type PublicClientApproval } from '../api'

export const PublicClientApprovalPage = ({ token }: Readonly<{ token: string }>): ReactElement => {
    const [item, setItem] = useState<PublicClientApproval | null>(null)
    const [error, setError] = useState('')
    const [feedback, setFeedback] = useState('')
    const [busy, setBusy] = useState(false)
    const [submitted, setSubmitted] = useState<'approved' | 'changes_requested' | null>(null)
    useEffect(() => { let active = true; void fetchClientApproval(token).then(({ item: details }) => { if (active) setItem(details) }).catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'This review link is unavailable.') }); return () => { active = false } }, [token])
    const send = (decision: 'approved' | 'changes_requested') => (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault()
        if (decision === 'changes_requested' && !feedback.trim()) { setError('Describe the changes you need before submitting.'); return }
        setBusy(true); setError('')
        void submitClientApproval(token, decision, feedback.trim()).then(() => setSubmitted(decision)).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not submit your response.')).finally(() => setBusy(false))
    }
    return <main className="min-h-screen bg-[#f5f6f1] px-4 py-10 text-[#253328] sm:py-16"><section className="mx-auto max-w-xl rounded-3xl border border-[#dfe6dc] bg-white p-6 shadow-[0_16px_50px_-36px_rgba(34,60,42,.35)] sm:p-9">
        <div className="mb-7 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-[#eaf1e7] text-[#315d46]"><ClipboardCheck aria-hidden="true" className="size-5" /></span><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#668356]">Worklist · Client review</p><p className="mt-0.5 text-xs text-[#879188]">Your feedback goes directly to the project team</p></div></div>
        {!item && !submitted ? <div role={error ? 'alert' : 'status'} className="py-8 text-center text-sm text-[#718076]">{error || 'Loading review…'}</div> : submitted ? <div className="py-8 text-center"><CheckCircle2 aria-hidden="true" className="mx-auto size-11 text-[#4a9a70]" /><h1 className="mt-4 font-serif text-2xl text-[#203d33]">{submitted === 'approved' ? 'Approved' : 'Feedback sent'}</h1><p className="mt-2 text-sm text-[#718076]">Thanks, {item?.contactName}. Your response has been recorded for the team.</p></div> : item && <>
            <p className="text-xs font-semibold uppercase tracking-[.13em] text-[#668356]">For {item.contactName}</p><h1 className="mt-2 font-serif text-3xl leading-tight text-[#203d33]">Review this work</h1><h2 className="mt-5 text-lg font-semibold">{item.title}</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#718076]">{item.description || 'The team has asked you to review this deliverable.'}</p>
            {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
            <form className="mt-6 grid gap-3" onSubmit={send('changes_requested')}><label className="grid gap-1.5 text-xs font-medium text-[#59665c]">Request changes<textarea className="min-h-24 rounded-xl border border-[#dfe5dc] bg-[#fbfcfa] px-3 py-2.5 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-[#668356]" maxLength={2000} onChange={(event) => setFeedback(event.target.value)} placeholder="What should be changed?" value={feedback} /></label><div className="flex flex-wrap justify-end gap-2"><Button disabled={busy} onClick={(event) => { event.preventDefault(); void submitClientApproval(token, 'approved', '').then(() => setSubmitted('approved')).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not submit your approval.')).finally(() => setBusy(false)); setBusy(true) }} type="button" variant="outline">{busy ? 'Sending…' : 'Approve'}</Button><Button className="bg-[#173f35] text-white hover:bg-[#245246]" disabled={busy || !feedback.trim()} type="submit">{busy ? 'Sending…' : 'Send requested changes'}</Button></div></form>
        </>}
    </section></main>
}
