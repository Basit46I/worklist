'use client'

import type { ReactElement, SubmitEventHandler } from 'react'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UserRound, UsersRound, type LucideIcon } from 'lucide-react'
import { Button, Input } from '@workspace/ui/primitives'
import { WorklistAuthBrand } from './worklist-auth-brand.js'

export type WorklistAuthLinks = Readonly<{ forgotPassword: string; verifyEmail: string; signIn: string; signUp: string }>
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

const defaultLinks: WorklistAuthLinks = { forgotPassword: '/forgot-password', verifyEmail: '/verify-email', signIn: '/sign-in', signUp: '/sign-up' }

export const WorklistAuthScreen = ({ mode, passwordVisible, registrationPassword, passwordStrength, authError, authNotice, authBusy, onPasswordVisibleChange, onRegistrationPasswordChange, onSubmit, links = defaultLinks }: WorklistAuthScreenProps): ReactElement => (
    <main className="worklist-auth min-h-screen bg-[#f3f5f0] p-3 text-[#17251f] sm:p-5 lg:grid lg:min-h-screen lg:grid-cols-[minmax(0,1.08fr)_minmax(440px,.92fr)] lg:gap-5">
        <WorklistAuthBrand />
        <section aria-labelledby="auth-title" className="flex min-h-[calc(100vh-1.5rem)] flex-col rounded-[1.6rem] border border-[#e7ebe5] bg-[#fffefa] px-5 py-6 shadow-[0_24px_70px_-50px_rgba(20,48,37,.25)] sm:px-10 sm:py-8 lg:min-h-[calc(100vh-2.5rem)] lg:justify-center xl:px-16">
            <div className="mb-10 flex items-center gap-3 lg:hidden">
                <span aria-hidden="true" className="grid size-10 place-items-center rounded-[14px] bg-[#1d4839] text-sm font-semibold text-[#e6f1d9]">W</span>
                <span className="text-lg font-semibold tracking-[-.04em]">Worklist</span>
            </div>
            <form className="mx-auto w-full max-w-[430px] space-y-5" onSubmit={onSubmit}>
                <div className="mb-8">
                    <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.19em] text-[#66836c]"><span className="size-1.5 rounded-full bg-[#7d9a77]" />{mode === 'register' ? 'Start with your team' : 'Your workspace'}</p>
                    <h1 className="text-[2rem] font-semibold leading-tight tracking-[-.055em] text-[#1c3027] sm:text-[2.45rem]" id="auth-title">{mode === 'register' ? 'Create your workspace' : 'Welcome back'}</h1>
                    <p className="mt-3 max-w-sm text-[14px] leading-6 text-[#748078]">{mode === 'register' ? 'Bring your team together and give every task a clear next step.' : 'Sign in to see what your team is moving forward today.'}</p>
                </div>
                {mode === 'register' && <>
                    <AuthField icon={UserRound} label="Your name"><Input aria-label="Your name" autoComplete="name" className="auth-input" name="name" placeholder="e.g. Ayesha Khan" required /></AuthField>
                    <AuthField icon={UsersRound} label="Workspace name"><Input aria-label="Team name" autoComplete="organization" className="auth-input" name="teamName" placeholder="e.g. Design team" required /></AuthField>
                </>}
                <AuthField icon={Mail} label="Email address"><Input aria-label="Email address" autoComplete="email" className="auth-input" name="email" placeholder="you@company.com" required type="email" /></AuthField>
                <AuthField icon={LockKeyhole} label="Password">
                    <span className="relative block">
                        <Input aria-label="Password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} className="auth-input pr-12" minLength={mode === 'register' ? 12 : undefined} name="password" onChange={(event) => { if (mode === 'register') onRegistrationPasswordChange(event.target.value) }} placeholder={mode === 'register' ? 'At least 12 characters' : 'Enter your password'} required type={passwordVisible ? 'text' : 'password'} />
                        <button aria-label={passwordVisible ? 'Hide password' : 'Show password'} aria-pressed={passwordVisible} className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-[#7e8982] transition hover:bg-[#edf2eb] hover:text-[#254638] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#739279]" onClick={() => { onPasswordVisibleChange(!passwordVisible) }} type="button">{passwordVisible ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}</button>
                    </span>
                </AuthField>
                {mode === 'register' && <div aria-label="Password strength" className="space-y-2">
                    <div aria-hidden="true" className="grid grid-cols-4 gap-1.5">{[1, 2, 3, 4].map((segment) => <span className={`h-1 rounded-full transition-colors ${passwordStrength >= segment ? (passwordStrength < 3 ? 'bg-[#c89a58]' : 'bg-[#6e9b75]') : 'bg-[#e8ece6]'}`} key={segment} />)}</div>
                    <p className="text-[11px] leading-5 text-[#818b84]">{registrationPassword ? `${String(passwordStrength)}/4 password requirements met` : 'Use 12+ characters with upper- and lowercase letters, a number, and a symbol.'}</p>
                </div>}
                {authError && <p className="rounded-xl border border-[#f1d5cf] bg-[#fff5f2] p-3.5 text-[13px] leading-5 text-[#a34238]" role="alert">{authError}</p>}
                {authNotice && <p className="rounded-xl border border-[#d5e8d8] bg-[#f2faf2] p-3.5 text-[13px] leading-5 text-[#326a42]" role="status">{authNotice}</p>}
                <Button className="auth-submit group h-[50px] w-full rounded-xl bg-[#214d3b] text-[13px] font-semibold text-white shadow-[0_8px_18px_-12px_rgba(27,74,53,.8)] transition hover:bg-[#173f30] focus-visible:ring-2 focus-visible:ring-[#7ca386]" disabled={authBusy} type="submit">{authBusy ? <><span aria-hidden="true" className="mr-2 size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />{mode === 'register' ? 'Creating workspace…' : 'Signing in…'}</> : <>{mode === 'register' ? 'Create workspace' : 'Sign in'}<ArrowRight aria-hidden="true" className="ml-2 size-4 transition-transform group-hover:translate-x-0.5" /></>}</Button>
                {mode === 'login' && <div className="flex flex-wrap justify-between gap-x-4 gap-y-2 text-[12px]"><a className="font-medium text-[#4c745a] underline-offset-4 hover:underline" href={links.forgotPassword}>Forgot password?</a><a className="font-medium text-[#4c745a] underline-offset-4 hover:underline" href={links.verifyEmail}>Resend verification</a></div>}
                <p className="border-t border-[#edf0eb] pt-5 text-center text-[13px] text-[#7b867f]">{mode === 'register' ? 'Already have a workspace?' : 'New to Worklist?'}{' '}<a className="font-semibold text-[#28543f] underline-offset-4 hover:underline" href={mode === 'register' ? links.signIn : links.signUp}>{mode === 'register' ? 'Sign in' : 'Create an account'}</a></p>
                {mode === 'register' && <p className="text-center text-[10px] leading-5 text-[#9aa39b]">By creating a workspace, you agree to use Worklist responsibly.</p>}
            </form>
            <p className="mx-auto mt-auto hidden w-full max-w-[430px] pt-8 text-[10px] text-[#a0a9a2] sm:block">© {new Date().getFullYear()} Worklist · Clear work, together.</p>
        </section>
    </main>
)

const AuthField = ({ icon: Icon, label, children }: Readonly<{ icon: LucideIcon; label: string; children: ReactElement }>): ReactElement => <label className="block space-y-2 text-[12px] font-semibold text-[#3a5144]"><span className="flex items-center gap-2"><Icon aria-hidden="true" className="size-3.5 text-[#7e9982]" />{label}</span>{children}</label>
