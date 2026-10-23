import type { RequestHandler } from 'express'

export type WorkItemController = Readonly<{
    guard: RequestHandler
    verifyOrigin: RequestHandler
    handleGetTemplates: RequestHandler
    handlePostTemplates: RequestHandler
    handlePatchTemplatesTemplateId: RequestHandler
    handleDeleteTemplatesTemplateId: RequestHandler
    handleGetLists: RequestHandler
    handlePostLists: RequestHandler
    handlePostListsListIdDuplicate: RequestHandler
    handlePatchListsListId: RequestHandler
    handlePostListsListIdArchive: RequestHandler
    handlePostListsListIdRestore: RequestHandler
    handleDeleteListsListId: RequestHandler
    handleGetWorkItems: RequestHandler
    handleGetWorkItemsEvents: RequestHandler
    handleGetWorkItemsItemIdComments: RequestHandler
    handlePostWorkItemsItemIdComments: RequestHandler
    handleGetWorkItemsItemIdActivity: RequestHandler
    handlePostWorkItems: RequestHandler
    handleDeleteWorkItems: RequestHandler
    handlePatchWorkItemsBulk: RequestHandler
    handleGetSavedViews: RequestHandler
    handlePostSavedViews: RequestHandler
    handlePatchSavedViewsViewId: RequestHandler
    handleDeleteSavedViewsViewId: RequestHandler
    handlePatchWorkItemsItemId: RequestHandler
    handlePostWorkItemsItemIdArchive: RequestHandler
    handlePostWorkItemsItemIdRestore: RequestHandler
    handlePostWorkItemsItemIdDuplicate: RequestHandler
    handleDeleteWorkItemsItemId: RequestHandler
}>
