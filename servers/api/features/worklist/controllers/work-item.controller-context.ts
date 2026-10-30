import type { createWorkItemAssignmentService } from '../work-item-assignment.service.js'
import type { WorkItemEventHub } from '../work-item.events.js'
import type { createWorkItemRepository } from '../work-item.repository.js'
import type { createSavedViewRepository } from '../saved-view.repository.js'
import type { createWorkItemCommentRepository } from '../work-item-comment.repository.js'
import type { createWorkItemActivityRepository } from '../work-item-activity.repository.js'
import type { createWorklistListRepository } from '../worklist-list.repository.js'
import type { createWorklistTemplateRepository } from '../worklist-template.repository.js'

export type WorkItemControllerContext = Readonly<{
    assignments: ReturnType<typeof createWorkItemAssignmentService>
    repository: ReturnType<typeof createWorkItemRepository>
    lists: ReturnType<typeof createWorklistListRepository>
    savedViews: ReturnType<typeof createSavedViewRepository>
    comments: ReturnType<typeof createWorkItemCommentRepository>
    activities: ReturnType<typeof createWorkItemActivityRepository>
    templates: ReturnType<typeof createWorklistTemplateRepository>
    events: WorkItemEventHub
}>
