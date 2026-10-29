import type { ReactElement } from 'react'
import { PublicClientRequestPage } from '@/features/worklist/components/public-client-request-page'

const ClientRequestPage = async ({ params }: Readonly<{ params: Promise<{ token: string }> }>): Promise<ReactElement> => {
    const { token } = await params
    return <PublicClientRequestPage token={token} />
}

export default ClientRequestPage
