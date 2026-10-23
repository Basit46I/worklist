export type WorkItemEvent = Readonly<{ type: 'items' }> | Readonly<{ type: 'comments' | 'activity'; itemId?: string }>

export type WorkItemEventHub = Readonly<{
    publish: (teamId: string, event?: WorkItemEvent) => void
    subscribe: (teamId: string, listener: (event: WorkItemEvent) => void) => () => void
}>

export const createWorkItemEventHub = (): WorkItemEventHub => {
    const listenersByTeam = new Map<string, Set<(event: WorkItemEvent) => void>>()
    return Object.freeze({
        publish: (teamId, event = { type: 'items' }) => {
            for (const listener of [...(listenersByTeam.get(teamId) ?? [])]) listener(event)
        },
        subscribe: (teamId, listener) => {
            const listeners = listenersByTeam.get(teamId) ?? new Set<(event: WorkItemEvent) => void>()
            listeners.add(listener)
            listenersByTeam.set(teamId, listeners)
            return () => {
                listeners.delete(listener)
                if (listeners.size === 0) listenersByTeam.delete(teamId)
            }
        }
    })
}
