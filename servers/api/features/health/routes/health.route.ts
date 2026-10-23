import { Router } from 'express'
import { createHealthController } from '../controllers/index.js'
import { createHealthService, type HealthServiceDependencies } from '../services/index.js'

export type HealthRouteDependencies = HealthServiceDependencies

export const createHealthRoutes = (dependencies: HealthRouteDependencies): Router => {
    const router = Router()
    const service = createHealthService(dependencies)
    const controllers = createHealthController({ service })

    router.get('/health', controllers.health)
    router.get('/ready', controllers.readiness)
    return router
}
