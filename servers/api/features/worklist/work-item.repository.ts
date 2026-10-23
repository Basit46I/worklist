import { createWorkItemMutationRepository } from './work-item.mutation.repository.js'
import { createWorkItemQueryRepository } from './work-item.query.repository.js'

export const createWorkItemRepository = () => Object.freeze({
    ...createWorkItemQueryRepository(),
    ...createWorkItemMutationRepository()
})
