import { createClient } from 'redis'
import { RedisStore, type RedisReply } from 'rate-limit-redis'
import type { Store } from 'express-rate-limit'
import type { Logger } from '@workspace/logging'

export type RateLimitStoreFactory = (scope: string) => Store

type RedisRateLimitClient = Readonly<{
    connect: () => Promise<void>
    close: () => Promise<void>
    sendCommand: (command: string[]) => Promise<RedisReply>
    onError: (listener: (error: Error) => void) => void
}>

type RedisRateLimitDependencies = Readonly<{ url: string; namespace: string; logger: Logger; client?: RedisRateLimitClient }>

const createNodeRedisClient = (url: string): RedisRateLimitClient => {
    const client = createClient({ url })
    return Object.freeze({
        connect: async (): Promise<void> => {
            await client.connect()
        },
        close: async (): Promise<void> => {
            if (client.isOpen) await client.quit()
        },
        sendCommand: (command: string[]): Promise<RedisReply> => client.sendCommand(command),
        onError: (listener: (error: Error) => void): void => {
            client.on('error', listener)
        }
    })
}

export const createRedisRateLimitStore = ({ url, namespace, logger, client = createNodeRedisClient(url) }: RedisRateLimitDependencies) => {
    client.onError((error) => {
        logger.warn('Redis rate-limit connection error.', { error: error.message })
    })
    return Object.freeze({
        connect: (): Promise<void> => client.connect(),
        disconnect: (): Promise<void> => client.close(),
        createStore: (scope: string): Store => {
            if (![namespace, scope].every((value) => /^[a-z0-9-]+$/.test(value))) throw new Error('Rate-limit store key contains unsupported characters.')
            return new RedisStore({
                prefix: `worklist:${namespace}:rate-limit:${scope}:`,
                sendCommand: (...command) => client.sendCommand(command)
            })
        }
    })
}

export type RedisRateLimitStore = ReturnType<typeof createRedisRateLimitStore>
