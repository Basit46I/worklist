'use client'

import type { ReactElement } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { WorklistAuthScreen } from '@workspace/worklist-ui'
import { logoutUser } from '../api'
import { WorklistPageContent } from './worklist-page-content'
import { useWorklistPageActions } from '../use-worklist-page-actions'
import { useWorklistPageData } from '../use-worklist-page-data'
import { useWorklistPageState } from '../use-worklist-page-state'

export type WorklistPageRoute = 'protected' | 'sign-in' | 'sign-up'

export const WorklistPage = ({ route }: Readonly<{ route: WorklistPageRoute }>): ReactElement => {
    const router = useRouter()
    const state = useWorklistPageState()
    const data = useWorklistPageData(route, router, state)
    const actions = useWorklistPageActions(route, router, state, data)

    if (!state.authChecked)
        return (
            <main className="grid min-h-screen place-items-center bg-[#f3f5f1] text-sm text-[#68736b]">
                <div className="flex items-center gap-3 rounded-2xl border border-[#e1e6dd] bg-white px-5 py-4 shadow-sm">
                    <span className="grid size-8 place-items-center rounded-lg bg-[#243b2c] text-sm font-bold text-[#c7f36b]">W</span>
                    <span>Connecting to your workspace…</span>
                </div>
            </main>
        )

    if (state.storageUnavailable)
        return (
            <main className="grid min-h-screen place-items-center bg-[#f8f9fb] px-5 text-slate-900">
                <section className="w-full max-w-lg rounded-2xl border border-amber-200 bg-white p-7 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">Worklist setup needed</p>
                    <h1 className="mt-2 text-2xl font-semibold">Database is not connected</h1>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                        Worklist needs MongoDB for accounts and saved tasks. Set{' '}
                        <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">MONGODB_URI</code> in{' '}
                        <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">servers/api/.env</code>, then restart the API and
                        reload this page.
                    </p>
                    <Link
                        className="mt-4 inline-block text-sm font-medium text-emerald-700 underline"
                        href="/">
                        Open setup overview
                    </Link>
                </section>
            </main>
        )

    if (state.startupError)
        return (
            <main className="grid min-h-screen place-items-center bg-[#f8f9fb] px-5 text-slate-900">
                <section className="w-full max-w-lg rounded-2xl border border-rose-200 bg-white p-7 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-widest text-rose-700">Worklist unavailable</p>
                    <h1 className="mt-2 text-2xl font-semibold">Could not connect to the API</h1>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{state.startupError}</p>
                    <button
                        className="mt-4 text-sm font-medium text-emerald-700 underline"
                        onClick={() => window.location.reload()}
                        type="button">
                        Try again
                    </button>
                </section>
            </main>
        )

    if (!state.user && route === 'protected')
        return <main className="grid min-h-screen place-items-center bg-[#f8f9fb] px-5 text-sm text-slate-500">Redirecting to sign in…</main>

    if (!state.user)
        return (
            <WorklistAuthScreen
                mode={route === 'sign-up' ? 'register' : 'login'}
                passwordVisible={actions.auth.passwordVisible}
                registrationPassword={actions.auth.registrationPassword}
                passwordStrength={actions.auth.passwordStrength}
                authError={actions.auth.authError}
                authNotice={actions.auth.authNotice}
                authBusy={actions.auth.authBusy}
                onPasswordVisibleChange={actions.auth.setPasswordVisible}
                onRegistrationPasswordChange={actions.auth.setRegistrationPassword}
                onSubmit={actions.auth.submitAuth}
            />
        )

    const signOut = (): void => {
        state.setSignOutBusy(true)
        void logoutUser()
            .then(() => {
                state.setUser(null)
                state.setItems([])
                state.setLists([])
                state.setActiveListId('')
                state.setNextCursor(null)
                state.setSelectedIds(new Set())
                router.replace('/sign-in')
            })
            .catch((error: unknown) =>
                state.setPageError(error instanceof Error ? `Could not sign out: ${error.message}` : 'Could not sign out. Please try again.')
            )
            .finally(() => state.setSignOutBusy(false))
    }

    return (
        <WorklistPageContent
            state={state}
            actions={{
                lists: actions.lists,
                templates: actions.templates,
                savedViews: actions.savedViews,
                views: actions.views,
                items: actions.items,
                bulk: actions.bulk,
                team: actions.team
            }}
            data={data}
            onSignOut={signOut}
        />
    )
}
