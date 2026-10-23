'use client'
import { AuthBrandPanel } from './auth-brand-panel'

import { useEffect, useRef, useState, type FormEvent, type ReactElement } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Input } from '@workspace/ui/primitives'
import { acceptTeamInvitation, confirmEmailVerification, requestEmailVerification, requestPasswordReset, resetPassword } from '../api'

export type AuthAction = 'forgot-password' | 'verify-email' | 'reset-password' | 'accept-invitation'

export const AuthActionPage = ({ action }: Readonly<{ action: AuthAction }>): ReactElement => {
    const router = useRouter()
    const token = useSearchParams().get('token') ?? ''
    const [email, setEmail] = useState('')
    const [busy, setBusy] = useState(false)
    const [passwordVisible, setPasswordVisible] = useState(false)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')
    const verificationStartedFor = useRef('')

    useEffect(() => {
        if (action === 'verify-email' && token && verificationStartedFor.current !== token) {
            verificationStartedFor.current = token
            void confirmEmailVerification(token)
                .then(() => setMessage('Email verified. You can now sign in.'))
                .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Could not verify this email.'))
        }
    }, [action, token])

    const submit = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        if (action === 'reset-password' && form.get('password') !== form.get('confirmPassword')) {
            setError('The passwords do not match.')
            setMessage('')
            return
        }
        setBusy(true)
        setError('')
        setMessage('')
        void (async () => {
            if (action === 'forgot-password') {
                const result = await requestPasswordReset(email)
                setMessage(result.message)
            } else if (action === 'verify-email' && !token) {
                const result = await requestEmailVerification(email)
                setMessage(result.message)
            } else if (action === 'reset-password') {
                await resetPassword(token, String(form.get('password') ?? ''))
                setMessage('Password changed. All previous sessions were signed out. You can sign in with your new password.')
            } else if (action === 'accept-invitation') {
                const user = await acceptTeamInvitation(token, String(form.get('name') ?? ''), String(form.get('password') ?? ''))
                setMessage(`Welcome to ${user.teamName}. Opening your worklist…`)
                router.replace('/dashboard')
            }
        })()
            .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'This request could not be completed.'))
            .finally(() => setBusy(false))
    }

    const titles: Readonly<Record<AuthAction, string>> = {
        'forgot-password': 'Reset your password',
        'verify-email': 'Verify your email',
        'reset-password': 'Choose a new password',
        'accept-invitation': 'Join your team'
    }
    const descriptions: Readonly<Record<AuthAction, string>> = {
        'forgot-password': 'Enter the email address on your account. We’ll send a secure link to choose a new password.',
        'verify-email': 'Confirm your email to finish setting up your account and keep your workspace secure.',
        'reset-password': 'Choose a strong password you have not used for this account before.',
        'accept-invitation': 'Set up your account to join your teammate’s workspace and start collaborating.'
    }
    const actionLabels: Readonly<Record<AuthAction, string>> = {
        'forgot-password': 'Send reset link',
        'verify-email': 'Send verification link',
        'reset-password': 'Save new password',
        'accept-invitation': 'Join workspace'
    }
    const needsForm =
        action === 'forgot-password' ||
        (action === 'verify-email' && !token) ||
        (action === 'reset-password' && Boolean(token)) ||
        (action === 'accept-invitation' && Boolean(token))

    return (
        <main className="min-h-screen bg-[#f3f5f1] px-4 py-5 text-[#17211c] sm:grid sm:place-items-center sm:px-6">
            <section className="mx-auto grid min-h-[min(760px,calc(100vh-2.5rem))] w-full max-w-5xl overflow-hidden rounded-[1.75rem] border border-[#e1e6dd] bg-white shadow-[0_24px_80px_-40px_rgba(23,33,28,0.28)] lg:grid-cols-[0.9fr_1.1fr]">
                <AuthBrandPanel />
                <div className="flex flex-col justify-center px-6 py-9 sm:px-12 lg:px-14 xl:px-20">
                    <Link
                        className="mb-12 flex w-fit items-center gap-3 font-semibold lg:hidden"
                        href="/sign-in">
                        <span className="grid size-9 place-items-center rounded-lg bg-[#243b2c] text-sm text-[#c7f36b]">W</span>Worklist
                    </Link>
                    <div className="mx-auto w-full max-w-md">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.19em] text-[#668356]">Account support</p>
                        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-[#17211c] sm:text-[2.15rem]">{titles[action]}</h1>
                        <p className="mt-3 text-sm leading-6 text-[#718076]">{descriptions[action]}</p>
                        {needsForm && (
                            <form
                                className="mt-8 space-y-5"
                                onSubmit={submit}>
                                {(action === 'forgot-password' || (action === 'verify-email' && !token)) && (
                                    <label className="block space-y-2 text-sm font-medium text-[#39483d]">
                                        Email address
                                        <Input
                                            aria-label="Email address"
                                            autoComplete="email"
                                            className="h-12 rounded-xl border-[#dfe5dc] bg-[#fbfcfa] px-3 font-normal focus-visible:ring-[#8aa37c]"
                                            onChange={(event) => setEmail(event.target.value)}
                                            placeholder="you@example.com"
                                            required
                                            type="email"
                                            value={email}
                                        />
                                    </label>
                                )}
                                {action === 'accept-invitation' && (
                                    <label className="block space-y-2 text-sm font-medium text-[#39483d]">
                                        Your name
                                        <Input
                                            aria-label="Your name"
                                            autoComplete="name"
                                            className="h-12 rounded-xl border-[#dfe5dc] bg-[#fbfcfa] px-3 font-normal"
                                            name="name"
                                            placeholder="e.g. Ayesha Khan"
                                            required
                                        />
                                    </label>
                                )}
                                {(action === 'reset-password' || action === 'accept-invitation') && (
                                    <label className="block space-y-2 text-sm font-medium text-[#39483d]">
                                        Password
                                        <span className="relative block">
                                            <Input
                                                aria-label="Password"
                                                autoComplete="new-password"
                                                className="h-12 rounded-xl border-[#dfe5dc] bg-[#fbfcfa] px-3 pr-12 font-normal"
                                                minLength={12}
                                                name="password"
                                                placeholder="At least 12 characters"
                                                required
                                                type={passwordVisible ? 'text' : 'password'}
                                            />
                                            <button
                                                aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                                                aria-pressed={passwordVisible}
                                                className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-[#7c897f] hover:bg-[#eef2eb] hover:text-[#263329]"
                                                onClick={() => setPasswordVisible((visible) => !visible)}
                                                type="button">
                                                {passwordVisible ? (
                                                    <EyeOff
                                                        aria-hidden="true"
                                                        className="size-4"
                                                    />
                                                ) : (
                                                    <Eye
                                                        aria-hidden="true"
                                                        className="size-4"
                                                    />
                                                )}
                                            </button>
                                        </span>
                                        <span className="block text-xs font-normal text-[#879188]">Use at least 12 characters.</span>
                                    </label>
                                )}
                                {action === 'reset-password' && (
                                    <label className="block space-y-2 text-sm font-medium text-[#39483d]">
                                        Confirm new password
                                        <Input
                                            aria-label="Confirm new password"
                                            autoComplete="new-password"
                                            className="h-12 rounded-xl border-[#dfe5dc] bg-[#fbfcfa] px-3 font-normal"
                                            minLength={12}
                                            name="confirmPassword"
                                            placeholder="Re-enter your new password"
                                            required
                                            type={passwordVisible ? 'text' : 'password'}
                                        />
                                    </label>
                                )}
                                {error && (
                                    <p
                                        className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm leading-5 text-rose-700"
                                        role="alert">
                                        {error}
                                    </p>
                                )}
                                {message && (
                                    <p
                                        className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm leading-5 text-emerald-800"
                                        role="status">
                                        {message}
                                    </p>
                                )}
                                <Button
                                    className="h-12 w-full rounded-xl bg-[#243b2c] font-medium text-white shadow-sm hover:bg-[#314b37]"
                                    disabled={busy}
                                    type="submit">
                                    {busy ? 'Please wait…' : actionLabels[action]}
                                </Button>
                            </form>
                        )}
                        {action === 'verify-email' && token && !message && !error && (
                            <p
                                className="mt-8 rounded-xl border border-[#e4e9e1] bg-[#f7f9f5] p-4 text-sm text-[#657268]"
                                role="status">
                                Checking your verification link…
                            </p>
                        )}
                        {(action === 'reset-password' || action === 'accept-invitation') && !token && (
                            <p
                                className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"
                                role="alert">
                                This link is missing its security token. Request a new email link and open it again.
                            </p>
                        )}
                        {(error || message) && !needsForm && (
                            <p
                                className={`mt-8 rounded-xl border p-4 text-sm leading-5 ${error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}
                                role={error ? 'alert' : 'status'}>
                                {error || message}
                            </p>
                        )}
                        <div className="mt-8 border-t border-[#edf0eb] pt-5 text-center">
                            <Link
                                className="text-sm font-medium text-[#526d46] hover:text-[#243b2c] hover:underline"
                                href="/sign-in">
                                Back to sign in
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    )
}
