import type { WorklistUser } from './api'

export const canEditWorkspace = (role: WorklistUser['role'] | string): boolean => role === 'owner' || role === 'editor'
export const canManageWorkspaceMembers = (role: WorklistUser['role'] | string): boolean => role === 'owner'
