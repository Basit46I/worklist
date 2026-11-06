import assert from 'node:assert/strict'
import test from 'node:test'
import { subscribeWorkItemEvents } from '../../features/worklist/api/events'

type Listener = (event: Event) => void

class FakeEventSource {
    static instance: FakeEventSource
    readonly listeners = new Map<string, Listener>()
    onopen: (() => void) | null = null
    closed = false
    constructor(readonly url: string, readonly options: EventSourceInit) { FakeEventSource.instance = this }
    addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
        this.listeners.set(type, typeof listener === 'function' ? listener as Listener : (event) => listener.handleEvent(event))
    }
    close(): void { this.closed = true }
    emit(type: string, event: Event): void { this.listeners.get(type)?.(event) }
}

void test('work item event stream refreshes on reconnect and visibility, validates payloads, and cleans up', () => {
    const original = {
        EventSource: Object.getOwnPropertyDescriptor(globalThis, 'EventSource'),
        window: Object.getOwnPropertyDescriptor(globalThis, 'window'),
        document: Object.getOwnPropertyDescriptor(globalThis, 'document')
    }
    const timers = new Map<number, () => void>()
    const windowListeners = new Map<string, EventListener>()
    const documentListeners = new Map<string, EventListener>()
    let timerId = 0
    const fakeWindow = {
        addEventListener: (type: string, callback: EventListener) => windowListeners.set(type, callback),
        removeEventListener: (type: string) => windowListeners.delete(type),
        setTimeout: (callback: () => void) => { const id = ++timerId; timers.set(id, callback); return id },
        clearTimeout: (id: number) => timers.delete(id)
    }
    const fakeDocument = {
        visibilityState: 'visible' as DocumentVisibilityState,
        addEventListener: (type: string, callback: EventListener) => documentListeners.set(type, callback),
        removeEventListener: (type: string) => documentListeners.delete(type)
    }
    Object.defineProperty(globalThis, 'EventSource', { configurable: true, value: FakeEventSource })
    Object.defineProperty(globalThis, 'window', { configurable: true, value: fakeWindow })
    Object.defineProperty(globalThis, 'document', { configurable: true, value: fakeDocument })

    try {
        const refreshes: string[] = []
        const comments: Array<string | null> = []
        const activities: Array<string | null> = []
        const unsubscribe = subscribeWorkItemEvents(
            () => refreshes.push('items'),
            (id) => comments.push(id),
            (id) => activities.push(id)
        )
        const source = FakeEventSource.instance
        assert.equal(source.url, '/api/work-items/events')
        assert.equal(source.options.withCredentials, true)
        source.onopen?.()
        source.onopen?.()
        assert.deepEqual(comments, [null, null])

        source.emit('items-refresh', new Event('items-refresh'))
        assert.equal(timers.size, 1)
        const [firstTimerId, firstTimer] = [...timers.entries()][0] ?? []
        if (firstTimerId !== undefined) timers.delete(firstTimerId)
        firstTimer?.()
        assert.deepEqual(refreshes, ['items'])

        source.emit('comments-refresh', Object.assign(new Event('comments-refresh'), { data: '{"itemId":"task-1"}' }))
        source.emit('comments-refresh', Object.assign(new Event('comments-refresh'), { data: '{}' }))
        source.emit('comments-refresh', Object.assign(new Event('comments-refresh'), { data: '{bad json' }))
        source.emit('comments-refresh', Object.assign(new Event('comments-refresh'), { data: '{"itemId":4}' }))
        source.emit('activity-refresh', Object.assign(new Event('activity-refresh'), { data: '{"itemId":"task-2"}' }))
        source.emit('activity-refresh', Object.assign(new Event('activity-refresh'), { data: '{broken' }))
        assert.deepEqual(comments, [null, null, 'task-1', null])
        assert.deepEqual(activities, ['task-2'])

        windowListeners.get('online')?.(new Event('online'))
        fakeDocument.visibilityState = 'hidden'
        documentListeners.get('visibilitychange')?.(new Event('visibilitychange'))
        assert.equal(timers.size, 1)
        fakeDocument.visibilityState = 'visible'
        documentListeners.get('visibilitychange')?.(new Event('visibilitychange'))
        assert.equal(timers.size, 1)
        unsubscribe()
        assert.equal(source.closed, true)
        assert.equal(windowListeners.size, 0)
        assert.equal(documentListeners.size, 0)
        assert.equal(timers.size, 0)
    } finally {
        for (const [key, descriptor] of Object.entries(original)) {
            if (descriptor) Object.defineProperty(globalThis, key, descriptor)
            else Reflect.deleteProperty(globalThis, key)
        }
    }
})
