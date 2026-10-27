type ApiRouteContext = Readonly<{ params: Promise<Readonly<{ path: readonly string[] }>> }>

const forwardApiRequest = async (request: Request, { params }: ApiRouteContext): Promise<Response> => {
    const { path } = await params
    const apiOrigin = (process.env.WORKLIST_API_INTERNAL_URL ?? 'http://127.0.0.1:4000').replace(/\/$/, '')
    const target = new URL(`${path.map(encodeURIComponent).join('/')}${new URL(request.url).search}`, `${apiOrigin}/`)
    const headers = new Headers(request.headers)
    for (const name of ['connection', 'content-length', 'host', 'origin', 'transfer-encoding']) headers.delete(name)
    headers.set('origin', 'http://localhost:3000')

    const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer()
    const upstream = await fetch(target, {
        method: request.method,
        headers,
        ...(body?.byteLength ? { body } : {}),
        cache: 'no-store',
        redirect: 'manual'
    })
    const responseHeaders = new Headers(upstream.headers)
    for (const name of ['content-encoding', 'content-length', 'transfer-encoding']) responseHeaders.delete(name)
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: responseHeaders })
}

export const GET = forwardApiRequest
export const HEAD = forwardApiRequest
export const POST = forwardApiRequest
export const PUT = forwardApiRequest
export const PATCH = forwardApiRequest
export const DELETE = forwardApiRequest
export const OPTIONS = forwardApiRequest
