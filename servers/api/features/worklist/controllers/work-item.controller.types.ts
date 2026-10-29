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
    handleGetSpaces: RequestHandler
    handlePostSpaces: RequestHandler
    handleGetSpaceFolders: RequestHandler
    handlePostSpaceFolders: RequestHandler
    handlePostListRequestForm: RequestHandler
    handleDeleteListRequestForm: RequestHandler
    handleGetClientRequestForm: RequestHandler
    handlePostClientRequestForm: RequestHandler
    handlePostRequestApproval: RequestHandler
    handleGetClientApproval: RequestHandler
    handlePostClientApproval: RequestHandler
    handleGetScheduledReminders: RequestHandler
}>
