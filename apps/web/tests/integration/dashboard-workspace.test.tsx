import assert from 'node:assert/strict'
import test from 'node:test'
import { connectDashboardWorkspace } from '../../features/worklist/dashboard-workspace'
import type { WorklistList, WorklistUser } from '../../features/worklist/api'
import type { WorkItem } from '../../features/worklist/model'

type DashboardConnector = Parameters<typeof connectDashboardWorkspace>[0]

type EventListener = (event: Event) => void
class FakeSource {
    static last: FakeSource
    readonly listeners = new Map<string, EventListener>()
    onopen: (() => void) | null = null
    closed = false
    constructor(readonly url: string) { FakeSource.last = this }
    addEventListener(type: string, listener: EventListener): void { this.listeners.set(type, listener) }
    close(): void { this.closed = true }
}

const user = { id: 'user-1', name: 'Ayesha', email: 'ayesha@example.test', teamId: 'team-1', teamName: 'Studio', role: 'owner' as const }
const list = { id: 'list-1', name: 'Launch', description: '', spaceName: 'Product', folderName: '', isDefault: false, archivedAt: null,
    settings: { sortField: 'dueDate' as const, sortDirection: 'asc' as const, groupBy: 'status' as const, visibleColumns: ['status' as const],
        columnWidths: { status: 150, priority: 120, assignee: 180, dueDate: 140 }, statuses: ['To do', 'Done'], budgetMinutes: 0 } }
const item: WorkItem = { id: 'item-1', listId: 'list-1', title: 'Ship', description: '', status: 'In progress', priority: 'High', assignee: 'Ayesha', dueDate: '2026-11-10', updatedAt: '2026-11-01T00:00:00.000Z' }
const installBrowserGlobals = () => {
    const original = Object.fromEntries(['fetch', 'EventSource', 'window', 'document'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
    const windowListeners = new Map<string, EventListener>()
    const documentListeners = new Map<string, EventListener>()
    Object.defineProperty(globalThis, 'EventSource', { configurable: true, value: FakeSource })
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { addEventListener: (key: string, fn: EventListener) => windowListeners.set(key, fn), removeEventListener: (key: string) => windowListeners.delete(key), setTimeout, clearTimeout } })
    Object.defineProperty(globalThis, 'document', { configurable: true, value: { visibilityState: 'visible', addEventListener: (key: string, fn: EventListener) => documentListeners.set(key, fn), removeEventListener: (key: string) => documentListeners.delete(key) } })
    return () => { for (const [key, descriptor] of Object.entries(original)) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key) } }
}
const makeState = (initialItems: readonly WorkItem[] = []) => {
    const state = { user: null as WorklistUser | null, lists: [] as readonly WorklistList[], items: initialItems, loading: true, error: '' }
    const setters = {
        setUser: (value: typeof user | null) => { state.user = value },
        setLists: (value: readonly typeof list[]) => { state.lists = value },
        setItems: (value: readonly WorkItem[] | ((current: readonly WorkItem[]) => readonly WorkItem[])) => { state.items = typeof value === 'function' ? value(state.items) : value },
        setLoading: (value: boolean) => { state.loading = value },
        setError: (value: string) => { state.error = value }
    }
    return { state, setters: setters as unknown as Pick<DashboardConnector, 'setUser' | 'setLists' | 'setItems' | 'setLoading' | 'setError'> }
}
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const flush = async () => { await new Promise((resolve) => setTimeout(resolve, 0)); await new Promise((resolve) => setTimeout(resolve, 0)) }

void test('dashboard connection routes unready and unauthenticated sessions to clear states', async () => {
    const restore = installBrowserGlobals()
    const originalFetch = globalThis.fetch
    try {
        const notReady = makeState()
        globalThis.fetch = async () => response({ status: 'not_ready', dependencies: { database: 'unavailable' } }, 503)
        const cleanupNotReady = connectDashboardWorkspace({ router: { replace: () => {} }, requestRevision: { current: 0 }, pendingItemUpdates: { current: new Set() }, ...notReady.setters })
        await flush()
        assert.equal(notReady.state.error, 'Worklist needs its database connection before the dashboard can load.')
        assert.equal(notReady.state.loading, false)
        cleanupNotReady()

        const unauthenticated = makeState()
        let redirect = ''
        globalThis.fetch = async () => response({ status: 'ready', dependencies: { database: 'available' } })
        const cleanupUnauthenticated = connectDashboardWorkspace({ router: { replace: (path) => { redirect = path } }, requestRevision: { current: 0 }, pendingItemUpdates: { current: new Set() }, ...unauthenticated.setters })
        await flush()
        assert.equal(redirect, '/sign-in')
        assert.equal(unauthenticated.state.loading, true)
        cleanupUnauthenticated()
    } finally { globalThis.fetch = originalFetch; restore() }
})

void test('dashboard connection loads all item pages and preserves local edits during server refreshes', async () => {
    const restore = installBrowserGlobals()
    const originalFetch = globalThis.fetch
    try {
        const local = { ...item, title: 'Local pending title', updatedAt: '2026-11-04T00:00:00.000Z' }
        const otherLocal: WorkItem = { ...item, id: 'local-only', title: 'Pending local task' }
        const harness = makeState([local, otherLocal])
        const pending = new Set(['item-1', 'local-only'])
        let itemPages = 0
        globalThis.fetch = async (input) => {
            const url = String(input)
            if (url.endsWith('/ready')) return response({ status: 'ready', dependencies: { database: 'available' } })
            if (url.endsWith('/auth/session')) return response({ user })
            if (url.includes('/lists?')) return response({ lists: [list] })
            if (url.includes('/work-items?')) {
                itemPages += 1
                if (url.includes('cursor=next')) return response({ items: [{ ...item, id: 'item-2', title: 'Second page' }], nextCursor: null })
                return response({ items: [item], nextCursor: 'next' })
            }
            throw new Error(`Unexpected request ${url}`)
        }
        const cleanup = connectDashboardWorkspace({ router: { replace: () => {} }, requestRevision: { current: 0 }, pendingItemUpdates: { current: pending }, ...harness.setters })
        await flush()
        assert.equal(harness.state.user?.id, user.id)
        assert.equal(harness.state.loading, false)
        assert.equal(harness.state.error, '')
        assert.equal(harness.state.lists.length, 1)
        assert.equal(itemPages, 2)
        assert.deepEqual(harness.state.items.map(({ id, title }) => ({ id, title })), [
            { id: 'item-1', title: 'Local pending title' }, { id: 'item-2', title: 'Second page' }, { id: 'local-only', title: 'Pending local task' }
        ])
        assert.ok(FakeSource.last)
        cleanup()
        assert.equal(FakeSource.last.closed, true)
    } finally { globalThis.fetch = originalFetch; restore() }
})

void test('dashboard connection reports API and list-load failures and ignores work after unmount', async () => {
    const restore = installBrowserGlobals()
    const originalFetch = globalThis.fetch
    try {
        const failure = makeState()
        globalThis.fetch = async (input) => {
            if (String(input).endsWith('/ready')) throw new Error('API offline')
            throw new Error('unexpected')
        }
        const cleanupFailure = connectDashboardWorkspace({ router: { replace: () => {} }, requestRevision: { current: 0 }, pendingItemUpdates: { current: new Set() }, ...failure.setters })
        await flush()
        assert.equal(failure.state.error, 'API offline')
        assert.equal(failure.state.loading, false)
        cleanupFailure()

        let resolveReadiness: ((value: Response) => void) | undefined
        globalThis.fetch = async () => new Promise<Response>((resolve) => { resolveReadiness = resolve })
        const unmounted = makeState()
        const cleanupUnmounted = connectDashboardWorkspace({ router: { replace: () => {} }, requestRevision: { current: 0 }, pendingItemUpdates: { current: new Set() }, ...unmounted.setters })
        cleanupUnmounted()
        resolveReadiness?.(response({ status: 'ready', dependencies: { database: 'available' } }))
        await flush()
        assert.equal(unmounted.state.error, '')
        assert.equal(unmounted.state.user, null)

        let resolveSession: ((value: Response) => void) | undefined
        globalThis.fetch = async (input) => String(input).endsWith('/ready')
            ? response({ status: 'ready', dependencies: { database: 'available' } })
            : new Promise<Response>((resolve) => { resolveSession = resolve })
        const duringSession = makeState()
        const cleanupDuringSession = connectDashboardWorkspace({ router: { replace: () => {} }, requestRevision: { current: 0 }, pendingItemUpdates: { current: new Set() }, ...duringSession.setters })
        await flush()
        cleanupDuringSession()
        resolveSession?.(response({ user }))
        await flush()
        assert.equal(duringSession.state.user, null)
        assert.equal(duringSession.state.error, '')
    } finally { globalThis.fetch = originalFetch; restore() }
})
