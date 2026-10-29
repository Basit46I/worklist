import { createAuthGuard, createAuthRepository, createAuthService, createOriginGuard } from '../../auth/public.js'
import { createWorkItemRepository } from '../work-item.repository.js'
import { createSavedViewRepository } from '../saved-view.repository.js'
import { createWorkItemCommentRepository } from '../work-item-comment.repository.js'
import { createWorkItemActivityRepository } from '../work-item-activity.repository.js'
import { createWorklistListRepository } from '../worklist-list.repository.js'
import { createWorklistTemplateRepository } from '../worklist-template.repository.js'
import { createWorklistHierarchyRepository } from '../worklist-hierarchy.repository.js'
import type { WorkItemEventHub } from '../work-item.events.js'
import type { WorkItemController } from './work-item.controller.types.js'
import { createWorklistStructureController } from './worklist-structure.controller.js'
import type { WorkItemControllerContext } from './work-item.controller-context.js'
import { createWorkItemHandlers } from './work-item.handlers.js'
import { createWorkItemCommentHandlers } from './work-item-comment.handlers.js'
import { createSavedViewHandlers } from './saved-view.handlers.js'
import { createClientRequestHandlers } from './client-request.handlers.js'
import { createClientApprovalHandlers } from './client-approval.handlers.js'
import type { EmailSender } from '../../../integrations/index.js'

export const createWorkItemController = (webOrigins: readonly string[], isPersistenceAvailable: () => boolean, events: WorkItemEventHub, options: Readonly<{ emailSender?: EmailSender; webOrigin: string; cronSecret?: string }>): WorkItemController => {
    const guard = createAuthGuard({ service: createAuthService({ repository: createAuthRepository(), isPersistenceAvailable }) })
    const repository = createWorkItemRepository()
    const lists = createWorklistListRepository()
    const savedViews = createSavedViewRepository()
    const comments = createWorkItemCommentRepository()
    const activities = createWorkItemActivityRepository()
    const templates = createWorklistTemplateRepository()
    const hierarchy = createWorklistHierarchyRepository()
    const verifyOrigin = createOriginGuard(webOrigins)
    const context: WorkItemControllerContext = { repository, lists, savedViews, comments, activities, templates, events }
    return Object.freeze({
        guard,
        verifyOrigin,
        ...createWorklistStructureController(repository, lists, templates, hierarchy),
        ...createWorkItemHandlers(context),
        ...createWorkItemCommentHandlers(context),
        ...createSavedViewHandlers(context),
        ...createClientRequestHandlers({ lists, items: repository, activities, events, isPersistenceAvailable }),
        ...createClientApprovalHandlers({ ...options, activities, events })
    })
}
