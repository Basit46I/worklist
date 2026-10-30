'use client'

import { useEffect, useState, type FormEvent, type ReactElement } from 'react'
import { ArrowRight, CheckCircle2, ClipboardList } from 'lucide-react'
import { Button, Input } from '@workspace/ui/primitives'
import { fetchClientRequestForm, submitClientRequest } from '../api'

type FormDetails = Readonly<{ listName: string; listDescription: string }>

const localDate = (): string => {
    const today = new Date()
    const offset = today.getTimezoneOffset() * 60_000
    return new Date(today.getTime() - offset).toISOString().slice(0, 10)
}

export const PublicClientRequestPage = ({ token }: Readonly<{ token: string }>): ReactElement => {
    const [form, setForm] = useState<FormDetails | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [submitted, setSubmitted] = useState(false)
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        let active = true
        void fetchClientRequestForm(token).then(({ form: details }) => {
            if (active) setForm(details)
        }).catch((cause: unknown) => {
            if (active) setError(cause instanceof Error ? cause.message : 'This request form is unavailable.')
        }).finally(() => {
            if (active) setLoading(false)
        })
        return () => { active = false }
    }, [token])

    const submit = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault()
        const values = new FormData(event.currentTarget)
        setBusy(true)
        setError('')
        void submitClientRequest(token, {
            contactName: String(values.get('contactName') ?? ''),
            contactEmail: String(values.get('contactEmail') ?? ''),
            title: String(values.get('title') ?? ''),
            details: String(values.get('details') ?? ''),
            dueDate: String(values.get('dueDate') ?? ''),
            website: String(values.get('website') ?? '')
        }).then(() => setSubmitted(true)).catch((cause: unknown) => {
            setError(cause instanceof Error ? cause.message : 'Could not send your request. Try again.')
        }).finally(() => setBusy(false))
    }

    return <main className="worklist-client-portal min-h-screen bg-[#f5f6f1] px-4 py-10 text-[#253328] sm:py-16">
        <section className="mx-auto max-w-xl rounded-3xl border border-[#dfe6dc] bg-white p-6 shadow-[0_16px_50px_-36px_rgba(34,60,42,.35)] sm:p-9">
            <div className="mb-7 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-[#eaf1e7] text-[#315d46]"><ClipboardList aria-hidden="true" className="size-5" /></span><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#668356]">Worklist · Client request</p><p className="mt-0.5 text-xs text-[#879188]">A clear way to get work moving</p></div></div>
            {loading ? <p className="py-10 text-center text-sm text-[#718076]">Loading request form…</p> : error && !form ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div> : submitted ? <div className="py-8 text-center"><CheckCircle2 aria-hidden="true" className="mx-auto size-11 text-[#4a9a70]" /><h1 className="mt-4 font-serif text-2xl text-[#203d33]">Request received</h1><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#718076]">Your request was sent to {form?.listName}. The team can follow up using the email you provided.</p></div> : <>
                <p className="text-xs font-semibold uppercase tracking-[.13em] text-[#668356]">{form?.listName}</p><h1 className="mt-2 font-serif text-3xl leading-tight text-[#203d33]">What would you like the team to work on?</h1><p className="mt-2 text-sm leading-6 text-[#718076]">{form?.listDescription || 'Share the details and the team will review your request.'}</p>
                <form className="mt-7 grid gap-4" onSubmit={submit}>
                    <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-xs font-medium text-[#59665c]">Your name<Input autoComplete="name" maxLength={120} name="contactName" required /></label><label className="grid gap-1.5 text-xs font-medium text-[#59665c]">Email address<Input autoComplete="email" maxLength={254} name="contactEmail" required type="email" /></label></div>
                    <label className="grid gap-1.5 text-xs font-medium text-[#59665c]">Request title<Input maxLength={200} name="title" placeholder="A short summary" required /></label>
                    <label className="grid gap-1.5 text-xs font-medium text-[#59665c]">What do you need?<textarea className="min-h-32 rounded-xl border border-[#dfe5dc] bg-[#fbfcfa] px-3 py-2.5 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-[#668356]" maxLength={2000} name="details" placeholder="Include context, goals, and useful links…" required /></label>
                    <label className="grid max-w-xs gap-1.5 text-xs font-medium text-[#59665c]">Requested due date<Input min={localDate()} name="dueDate" required type="date" /></label>
                    <label aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">Website<Input autoComplete="off" name="website" tabIndex={-1} /></label>
                    {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
                    <Button className="mt-1 h-11 justify-center rounded-xl bg-[#173f35] text-white hover:bg-[#245246]" disabled={busy} type="submit">{busy ? 'Sending request…' : <>Send request <ArrowRight aria-hidden="true" className="ml-1 size-4" /></>}</Button>
                    <p className="text-center text-[11px] leading-5 text-[#879188]">This request form is private to the list link. Your contact details are shared with its workspace team.</p>
                </form>
            </>}
        </section>
    </main>
}
