import { Suspense, type ReactElement } from 'react'
import { AuthActionPage } from '@/features/worklist/components/auth-action-page'

const AcceptInvitationPage = (): ReactElement => (
    <Suspense fallback={<main className="p-10 text-sm text-slate-500">Loading…</main>}>
        <AuthActionPage action="accept-invitation" />
    </Suspense>
)
export default AcceptInvitationPage
