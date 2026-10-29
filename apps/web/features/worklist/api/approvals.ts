import { request } from './client'

export type PublicClientApproval = Readonly<{ title: string; description: string; contactName: string }>
export const fetchClientApproval = (token: string): Promise<{ item: PublicClientApproval }> => request(`/client-approvals/${encodeURIComponent(token)}`)
export const submitClientApproval = (token: string, decision: 'approved' | 'changes_requested', feedback: string): Promise<{ submitted: true }> =>
    request(`/client-approvals/${encodeURIComponent(token)}`, { method: 'POST', body: JSON.stringify({ decision, feedback }) })
