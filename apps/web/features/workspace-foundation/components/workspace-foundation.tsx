import type { ReactElement } from 'react'
import { Activity, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button, PageHeader, PageShell } from '@workspace/ui'
import { ApiBoundary } from './api-boundary'
import { RuntimeFoundation } from './runtime-foundation'

type WorkspaceFoundationProps = Readonly<{
    apiBaseUrl: string
}>

export const WorkspaceFoundation = ({ apiBaseUrl }: WorkspaceFoundationProps): ReactElement => (
    <PageShell>
        <PageHeader
            description="Create a team workspace, then plan, sort, and track its tasks in one shared list."
            eyebrow="Worklist"
            icon={
                <Activity
                    aria-hidden="true"
                    className="size-5"
                />
            }
            title="A clear view of your team's work."
        />
        <RuntimeFoundation />
        <div className="mb-8">
            <Button asChild>
                <Link href="/worklist">
                    Open Worklist <ArrowRight aria-hidden="true" />
                </Link>
            </Button>
        </div>
        <ApiBoundary baseUrl={apiBaseUrl} />
    </PageShell>
)
