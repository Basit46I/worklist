import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorkItemEventHub } from '../work-item.events.js'

void test('work item events are delivered only to subscribers in the same team', () => {
    const events = createWorkItemEventHub()
    const received: string[] = []
    events.subscribe('team-a', (event) => {
        received.push(`a:${event.type}`)
    })
    events.subscribe('team-b', (event) => {
        received.push(`b:${event.type}`)
    })

    events.publish('team-a')

    assert.deepEqual(received, ['a:items'])
})

void test('unsubscribed listeners stop receiving events', () => {
    const events = createWorkItemEventHub()
    const received: string[] = []
    const unsubscribe = events.subscribe('team-a', (event) => {
        received.push(event.type)
    })

    unsubscribe()
    events.publish('team-a', { type: 'comments', itemId: 'item-1' })

    assert.deepEqual(received, [])
})
