import { Router } from 'express'
import type { OperationsMetrics } from '../../../integrations/index.js'
import { createAuthGuard, createAuthRepository, createAuthService } from '../../auth/public.js'
import type { createOperationsLogRepository } from '../operations-log.repository.js'
import { createOperationsController } from '../controllers/index.js'

export type OperationsRouteDependencies = Readonly<{
    metrics: OperationsMetrics
    logs: ReturnType<typeof createOperationsLogRepository>
    isPersistenceAvailable: () => boolean
    otlpExportConfigured: boolean
    metricsBearerToken?: string
}>

export const createOperationsRoutes = (dependencies: OperationsRouteDependencies): Router => {
    const router = Router()
    const authService = createAuthService({ repository: createAuthRepository(), isPersistenceAvailable: dependencies.isPersistenceAvailable })
    const requireSession = createAuthGuard({ service: authService })
    const controller = createOperationsController(dependencies)

    router.get('/metrics', controller.metricsBearerGuard, controller.metricsExport)
    router.get('/operations/metrics', requireSession, controller.operationsMetrics)
    router.get('/operations/logs', requireSession, controller.operationsLogs)
    return router
}
