export const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api'

export const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(`${apiBaseUrl}${path}`, {
        ...init,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...init?.headers }
    })
    if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null
        const requestId = response.headers.get('x-request-id')
        const traceId = response.headers.get('x-trace-id')
        const correlation = [requestId && `Request ID: ${requestId}`, traceId && `Trace ID: ${traceId}`].filter(Boolean).join(' · ')
        const message = body?.error?.message ?? `Request failed (${response.status}).`
        throw new Error(correlation ? `${message} (${correlation})` : message)
    }
    if (response.status === 204) return undefined as T
    return response.json() as Promise<T>
}
