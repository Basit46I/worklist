import type { ApiHealthResponse } from '@workspace/types'

export type HealthServiceDependencies = Readonly<{
    environment: ApiHealthResponse['environment']
    serviceName: ApiHealthResponse['service']
    isPersistenceAvailable: () => boolean
}>

export type ApiReadinessResponse = Readonly<{
    status: 'ready' | 'not_ready'
    dependencies: Readonly<{ database: 'available' | 'unavailable' }>
}>

export type HealthService = Readonly<{
    getHealth: () => ApiHealthResponse
    getReadiness: () => ApiReadinessResponse
}>

export const createHealthService = ({ environment, serviceName, isPersistenceAvailable }: HealthServiceDependencies): HealthService => ({
    getHealth: () => ({ status: 'ok', service: serviceName, environment }),
    getReadiness: () =>
        isPersistenceAvailable()
            ? { status: 'ready', dependencies: { database: 'available' } }
            : { status: 'not_ready', dependencies: { database: 'unavailable' } }
})
