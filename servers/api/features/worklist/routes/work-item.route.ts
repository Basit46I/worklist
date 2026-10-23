import { Router } from 'express'
import { createWorkItemController } from '../controllers/work-item.controller.js'
import type { WorkItemEventHub } from '../work-item.events.js'

export const createWorkItemRoutes = (webOrigins: readonly string[], isPersistenceAvailable: () => boolean, events: WorkItemEventHub): Router => {
    const router = Router()
    const controller = createWorkItemController(webOrigins, isPersistenceAvailable, events)
    router.get('/templates', controller.guard, controller.handleGetTemplates)
    router.post('/templates', controller.guard, controller.verifyOrigin, controller.handlePostTemplates)
    router.patch('/templates/:templateId', controller.guard, controller.verifyOrigin, controller.handlePatchTemplatesTemplateId)
    router.delete('/templates/:templateId', controller.guard, controller.verifyOrigin, controller.handleDeleteTemplatesTemplateId)
    router.get('/lists', controller.guard, controller.handleGetLists)
    router.post('/lists', controller.guard, controller.verifyOrigin, controller.handlePostLists)
    router.post('/lists/:listId/duplicate', controller.guard, controller.verifyOrigin, controller.handlePostListsListIdDuplicate)
    router.patch('/lists/:listId', controller.guard, controller.verifyOrigin, controller.handlePatchListsListId)
    router.post('/lists/:listId/archive', controller.guard, controller.verifyOrigin, controller.handlePostListsListIdArchive)
    router.post('/lists/:listId/restore', controller.guard, controller.verifyOrigin, controller.handlePostListsListIdRestore)
    router.delete('/lists/:listId', controller.guard, controller.verifyOrigin, controller.handleDeleteListsListId)
    router.get('/work-items', controller.guard, controller.handleGetWorkItems)
    router.get('/work-items/events', controller.guard, controller.handleGetWorkItemsEvents)
    router.get('/work-items/:itemId/comments', controller.guard, controller.handleGetWorkItemsItemIdComments)
    router.get('/work-items/:itemId/activity', controller.guard, controller.handleGetWorkItemsItemIdActivity)
    router.post('/work-items/:itemId/comments', controller.guard, controller.verifyOrigin, controller.handlePostWorkItemsItemIdComments)
    router.post('/work-items', controller.guard, controller.verifyOrigin, controller.handlePostWorkItems)
    router.post('/work-items/:itemId/archive', controller.guard, controller.verifyOrigin, controller.handlePostWorkItemsItemIdArchive)
    router.post('/work-items/:itemId/restore', controller.guard, controller.verifyOrigin, controller.handlePostWorkItemsItemIdRestore)
    router.post('/work-items/:itemId/duplicate', controller.guard, controller.verifyOrigin, controller.handlePostWorkItemsItemIdDuplicate)
    router.delete('/work-items', controller.guard, controller.verifyOrigin, controller.handleDeleteWorkItems)
    router.patch('/work-items/bulk', controller.guard, controller.verifyOrigin, controller.handlePatchWorkItemsBulk)
    router.get('/saved-views', controller.guard, controller.handleGetSavedViews)
    router.post('/saved-views', controller.guard, controller.verifyOrigin, controller.handlePostSavedViews)
    router.patch('/saved-views/:viewId', controller.guard, controller.verifyOrigin, controller.handlePatchSavedViewsViewId)
    router.delete('/saved-views/:viewId', controller.guard, controller.verifyOrigin, controller.handleDeleteSavedViewsViewId)
    router.patch('/work-items/:itemId', controller.guard, controller.verifyOrigin, controller.handlePatchWorkItemsItemId)
    router.delete('/work-items/:itemId', controller.guard, controller.verifyOrigin, controller.handleDeleteWorkItemsItemId)
    return router
}
