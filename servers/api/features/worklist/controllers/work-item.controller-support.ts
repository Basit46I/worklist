import type { Request } from 'express'
import { createApplicationError } from '../../../errors/index.js'
import { ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS } from '../../../constants/index.js'
import type { AuthIdentity } from '../../auth/public.js'

export const missingItem = () =>
    createApplicationError({ code: ERROR_CODES.routeNotFound, message: 'The requested work item was not found.', status: HTTP_STATUS.notFound })
export const duplicateSavedViewName = () =>
    createApplicationError({ code: ERROR_CODES.conflict, message: 'A saved view with this name already exists.', status: HTTP_STATUS.conflict })
export const duplicateListName = () =>
    createApplicationError({
        code: ERROR_CODES.conflict,
        message: 'A list with this name already exists in this workspace.',
        status: HTTP_STATUS.conflict
    })
export const duplicateTemplateName = () =>
    createApplicationError({
        code: ERROR_CODES.conflict,
        message: 'A template with this name already exists in your workspace.',
        status: HTTP_STATUS.conflict
    })
export const nonEmptyList = () =>
    createApplicationError({
        code: ERROR_CODES.conflict,
        message: 'This list still has tasks. Move or delete its tasks before deleting the list.',
        status: HTTP_STATUS.conflict
    })

export const isDuplicateKeyError = (error: unknown): boolean => typeof error === 'object' && error !== null && 'code' in error && error.code === 11000

export const requireIdentity = (request: Request): AuthIdentity => {
    const identity = (request as Request & { authIdentity?: AuthIdentity }).authIdentity
    if (!identity)
        throw createApplicationError({ code: ERROR_CODES.unauthenticated, message: ERROR_MESSAGES.unauthenticated, status: HTTP_STATUS.unauthorized })
    return identity
}

export const requireItemEditor = (request: Request): AuthIdentity => {
    const identity = requireIdentity(request)
    if (identity.role !== 'owner' && identity.role !== 'editor')
        throw createApplicationError({ code: ERROR_CODES.forbidden, message: ERROR_MESSAGES.forbidden, status: HTTP_STATUS.forbidden })
    return identity
}

const routeParameter = (request: Request, name: string): string => {
    const value = request.params[name]
    return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

export const getItemId = (request: Request): string => routeParameter(request, 'itemId')
export const getListId = (request: Request): string => routeParameter(request, 'listId')
export const getTemplateId = (request: Request): string => routeParameter(request, 'templateId')
