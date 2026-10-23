'use client'

import { useState, type FormEvent } from 'react'
import { fetchSavedViews, loginUser, registerUser, type SavedView, type WorklistUser } from './api'

type UseWorklistAuthOptions = Readonly<{
    mode: 'login' | 'register'
    router: Readonly<{ replace: (path: '/dashboard') => void }>
    setUser: (user: WorklistUser) => void
    setAuthChecked: (checked: boolean) => void
    setSavedViews: (views: readonly SavedView[]) => void
    setPageError: (message: string) => void
}>

export const useWorklistAuth = ({ mode, router, setUser, setAuthChecked, setSavedViews, setPageError }: UseWorklistAuthOptions) => {
    const [passwordVisible, setPasswordVisible] = useState(false)
    const [registrationPassword, setRegistrationPassword] = useState('')
    const [authError, setAuthError] = useState('')
    const [authNotice, setAuthNotice] = useState('')
    const [authBusy, setAuthBusy] = useState(false)
    const passwordStrength = [
        registrationPassword.length >= 12,
        /[a-z]/.test(registrationPassword) && /[A-Z]/.test(registrationPassword),
        /\d/.test(registrationPassword),
        /[^A-Za-z0-9]/.test(registrationPassword)
    ].filter(Boolean).length

    const submitAuth = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        const email = String(form.get('email') ?? '')
        const password = String(form.get('password') ?? '')
        setAuthBusy(true)
        setAuthError('')
        setAuthNotice('')
        void (async () => {
            if (mode === 'register') {
                await registerUser({ name: String(form.get('name') ?? ''), email, password, teamName: String(form.get('teamName') ?? '') })
                setAuthNotice('Account created. Check your email for a verification link before signing in.')
                return
            }
            const nextUser = await loginUser({ email, password })
            setUser(nextUser)
            setAuthChecked(true)
            router.replace('/dashboard')
            await fetchSavedViews()
                .then(setSavedViews)
                .catch((error: unknown) => setPageError(error instanceof Error ? error.message : 'Could not load your saved views.'))
        })()
            .catch((error: unknown) => setAuthError(error instanceof Error ? error.message : 'Sign in failed.'))
            .finally(() => setAuthBusy(false))
    }

    return {
        passwordVisible,
        setPasswordVisible,
        registrationPassword,
        setRegistrationPassword,
        passwordStrength,
        authError,
        authNotice,
        authBusy,
        submitAuth
    } as const
}
