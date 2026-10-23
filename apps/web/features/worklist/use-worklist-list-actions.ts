'use client'

import type { UseWorklistListActionsOptions } from './use-worklist-list-actions.types'
import { createWorklistListLifecycleActions } from './worklist-list-lifecycle-actions'
import { createWorklistListSettingsActions } from './worklist-list-settings-actions'
import { useWorklistListSelection } from './use-worklist-list-selection'

export const useWorklistListActions = (options: UseWorklistListActionsOptions) => {
    const selection = useWorklistListSelection(options)
    const lifecycle = createWorklistListLifecycleActions(options, selection.selectList)
    const settings = createWorklistListSettingsActions(options)
    return { ...selection, ...lifecycle, ...settings } as const
}
