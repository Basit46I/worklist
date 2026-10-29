import { PublicClientApprovalPage } from '@/features/worklist/components/public-client-approval-page'

export default async function ClientApprovalRoute({ params }: Readonly<{ params: Promise<Readonly<{ token: string }>> }>) {
    const { token } = await params
    return <PublicClientApprovalPage token={token} />
}
