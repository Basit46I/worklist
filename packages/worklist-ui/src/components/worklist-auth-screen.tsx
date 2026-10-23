'use client'

import type { ReactElement, SubmitEventHandler } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button, Input } from '@workspace/ui/primitives'
import { WorklistAuthBrand } from './worklist-auth-brand.js'

export type WorklistAuthLinks = Readonly<{
    forgotPassword: string
    verifyEmail: string
    signIn: string
    signUp: string
}>

export type WorklistAuthScreenProps = Readonly<{
    mode: 'login' | 'register'
    passwordVisible: boolean
    registrationPassword: string
    passwordStrength: number
    authError: string
    authNotice: string
    authBusy: boolean
    onPasswordVisibleChange: (visible: boolean) => void
    onRegistrationPasswordChange: (password: string) => void
    onSubmit: SubmitEventHandler<HTMLFormElement>
    links?: WorklistAuthLinks
}>

const defaultLinks: WorklistAuthLinks = {
    forgotPassword: '/forgot-password',
    verifyEmail: '/verify-email',
    signIn: '/sign-in',
    signUp: '/sign-up',
}

export const WorklistAuthScreen = ({
    mode,
    passwordVisible,
    registrationPassword,
    passwordStrength,
    authError,
    authNotice,
    authBusy,
    onPasswordVisibleChange,
    onRegistrationPasswordChange,
    onSubmit,
    links = defaultLinks,
}: WorklistAuthScreenProps): ReactElement => (
    <main className="min-h-screen bg-[#f3f5f1] p-3 text-[#17211c] sm:p-5 lg:grid lg:min-h-screen lg:grid-cols-[1.03fr_0.97fr] lg:gap-5">
        <WorklistAuthBrand />
        <section className="flex min-h-[calc(100vh-1.5rem)] flex-col rounded-[1.75rem] bg-white px-5 py-6 shadow-[0_24px_80px_-48px_rgba(23,33,28,0.26)] sm:px-10 sm:py-8 lg:min-h-[calc(100vh-2.5rem)] lg:justify-center xl:px-16">
            <div className="mb-10 flex items-center gap-3 lg:hidden">
                <span className="grid size-9 place-items-center rounded-xl bg-[#263b2d] font-bold text-[#c7f36b]">W</span>
                <span className="font-semibold tracking-tight">Worklist</span>
            </div>
            <form
                className="mx-auto w-full max-w-md space-y-5"
                onSubmit={onSubmit}>
                <div className="mb-8">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#668356]">
                        {mode === 'register' ? 'Get your team started' : 'Your workspace awaits'}
                    </p>
                    <h1 className="text-3xl font-semibold tracking-[-0.045em] text-[#17211c] sm:text-[2.6rem]">
                        {mode === 'register' ? 'Create your workspace' : 'Welcome back'}
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-[#718076]">
                        {mode === 'register' ? 'Set up your team space and start organizing work.' : 'Sign in to pick up where your team left off.'}
                    </p>
                </div>
                {mode === 'register' && (
                    <>
                        <label className="block space-y-1.5 text-sm font-medium text-[#39483d]">
                            Your name
                            <Input
                                aria-label="Your name"
                                autoComplete="name"
                                className="h-12 rounded-xl border-[#dfe5dc] bg-[#fbfcfa] px-3 font-normal focus-visible:ring-[#8aa37c]"
                                name="name"
                                placeholder="e.g. Ayesha Khan"
                                required
                            />
                        </label>
                        <label className="block space-y-1.5 text-sm font-medium text-[#39483d]">
                            Workspace name
                            <Input
                                aria-label="Team name"
                                autoComplete="organization"
                                className="h-12 rounded-xl border-[#dfe5dc] bg-[#fbfcfa] px-3 font-normal focus-visible:ring-[#8aa37c]"
                                name="teamName"
                                placeholder="e.g. Design team"
                                required
                            />
                        </label>
                    </>
                )}
                <label className="block space-y-1.5 text-sm font-medium text-[#39483d]">
                    Email address
                    <Input
                        aria-label="Email address"
                        autoComplete="email"
                        className="h-12 rounded-xl border-[#dfe5dc] bg-[#fbfcfa] px-3 font-normal focus-visible:ring-[#8aa37c]"
                        name="email"
                        placeholder="you@example.com"
                        required
                        type="email"
                    />
                </label>
                <label className="block space-y-1.5 text-sm font-medium text-[#39483d]">
                    Password
                    <span className="relative block">
                        <Input
                            aria-label="Password"
                            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                            className="h-12 rounded-xl border-[#dfe5dc] bg-[#fbfcfa] px-3 pr-12 font-normal focus-visible:ring-[#8aa37c]"
                            minLength={mode === 'register' ? 12 : undefined}
                            name="password"
                            onChange={(event) => {
                                if (mode === 'register') onRegistrationPasswordChange(event.target.value)
                            }}
                            placeholder={mode === 'register' ? 'At least 12 characters' : 'Enter your password'}
                            required
                            type={passwordVisible ? 'text' : 'password'}
                        />
                        <button
                            aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                            aria-pressed={passwordVisible}
                            className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-[#7c897f] hover:bg-[#eef2eb] hover:text-[#263329]"
                            onClick={() => { onPasswordVisibleChange(!passwordVisible) }}
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
                </label>
                {mode === 'register' && (
                    <div
                        aria-label="Password strength"
                        className="space-y-2">
                        <div
                            aria-hidden="true"
                            className="grid grid-cols-4 gap-1">
                            {[1, 2, 3, 4].map((segment) => (
                                <span
                                    className={`h-1 rounded-full ${passwordStrength >= segment ? (passwordStrength === 1 ? 'bg-[#d98b7c]' : passwordStrength === 2 ? 'bg-[#d9b45f]' : 'bg-[#4a9a70]') : 'bg-[#e5eae1]'}`}
                                    key={segment}
                                />
                            ))}
                        </div>
                        <p className="text-xs text-[#879188]">
                            {registrationPassword
                                ? `${String(passwordStrength)}/4 password requirements met`
                                : 'Use at least 12 characters, upper- and lowercase letters, a number, and a symbol.'}
                        </p>
                    </div>
                )}
                {authError && (
                    <p
                        className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm leading-5 text-rose-700"
                        role="alert">
                        {authError}
                    </p>
                )}
                {authNotice && (
                    <p
                        className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm leading-5 text-emerald-800"
                        role="status">
                        {authNotice}
                    </p>
                )}
                <Button
                    className="h-12 w-full rounded-xl bg-[#243b2c] font-medium text-white shadow-sm hover:bg-[#314b37]"
                    disabled={authBusy}
                    type="submit">
                    {authBusy ? 'Please wait…' : mode === 'register' ? 'Create workspace' : 'Sign in'}
                </Button>
                {mode === 'login' && (
                    <div className="flex flex-wrap justify-between gap-x-4 gap-y-2 text-sm">
                        <a
                            className="text-[#526d46] hover:underline"
                            href={links.forgotPassword}>
                            Forgot password?
                        </a>
                        <a
                            className="text-[#526d46] hover:underline"
                            href={links.verifyEmail}>
                            Resend verification
                        </a>
                    </div>
                )}
                <p className="border-t border-[#edf0eb] pt-5 text-center text-sm text-[#718076]">
                    {mode === 'register' ? 'Already have a workspace?' : 'New to Worklist?'}{' '}
                    <a
                        className="font-medium text-[#344e37] hover:underline"
                        href={mode === 'register' ? links.signIn : links.signUp}>
                        {mode === 'register' ? 'Sign in' : 'Create an account'}
                    </a>
                </p>
                {mode === 'register' && (
                    <p className="text-center text-xs leading-5 text-[#9aa39b]">By creating a workspace, you agree to use Worklist responsibly.</p>
                )}
            </form>
        </section>
    </main>
)
