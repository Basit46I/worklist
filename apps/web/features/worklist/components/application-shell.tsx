'use client'

import type { ReactElement, ReactNode } from 'react'
import Link from 'next/link'
import type { Route } from 'next'
import { WorklistShell, type WorklistShellContext, type WorklistShellList, type WorklistWorkspaceAction } from '@workspace/worklist-ui'
import type { WorklistUser } from '../api'

type ApplicationRoute = 'dashboard' | 'worklist' | 'board' | 'calendar'

export const ApplicationShell = ({
    activeRoute,
    children,
    onSignOut,
    signOutBusy,
    user,
    workspaceActions,
    workspaceLists,
    activeListId,
    projectContext,
    onListSelect,
    onCreateList,
}: Readonly<{
    activeRoute: ApplicationRoute
    children: ReactNode
    onSignOut: () => void
    signOutBusy: boolean
    user: WorklistUser
    workspaceActions?: readonly WorklistWorkspaceAction[]
    workspaceLists?: readonly WorklistShellList[]
    activeListId?: string
    projectContext?: WorklistShellContext
    onListSelect?: (listId: string) => void
    onCreateList?: () => void
}>): ReactElement => (
    <WorklistShell
        activeRoute={activeRoute}
        onSignOut={onSignOut}
        signOutBusy={signOutBusy}
        user={user}
        {...(workspaceActions ? { workspaceActions } : {})}
        {...(workspaceLists ? { workspaceLists } : {})}
        {...(activeListId ? { activeListId } : {})}
        {...(projectContext ? { projectContext } : {})}
        {...(onListSelect ? { onListSelect } : {})}
        {...(onCreateList ? { onCreateList } : {})}
        renderLink={(props) => (
            <Link
                {...(props['aria-current'] ? { 'aria-current': props['aria-current'] } : {})}
                className={props.className}
                href={props.href as Route}
                key={props.key}
                {...(props.onClick ? { onClick: props.onClick } : {})}>
                {props.children}
            </Link>
        )}>
        {children}
    </WorklistShell>
)
