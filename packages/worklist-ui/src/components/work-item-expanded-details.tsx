'use client'

import { useEffect, useState, type ReactElement } from 'react'
import type { WorkItem, WorkItemActivityClient, WorkItemApprovalClient, WorklistCommentClient, WorklistListOption } from '../model/index.js'
import { WorkItemComments } from './work-item-comments.js'
import { WorkItemActivityFeed } from './work-item-activity.js'
import { WorkItemExpandedCorePanels } from './work-item-expanded-core-panels.js'
import { WorkItemExpandedOrganizationPanels } from './work-item-expanded-organization-panels.js'

type Props = Readonly<{
    item: WorkItem
    availableItems: readonly WorkItem[]
    lists: readonly WorklistListOption[]
    canEdit: boolean
    expanded: boolean
    commentRefreshSequence: number
    commentRefreshItemId: string | null
    commentClient: WorklistCommentClient
    activityClient: WorkItemActivityClient
    approvalClient: WorkItemApprovalClient
    onUpdate: (itemId: string, changes: Partial<WorkItem>) => void
    onCreateSubtask: (parentId: string, title: string) => void
}>

export const WorkItemExpandedDetails = ({ item, availableItems, lists, canEdit, expanded, commentRefreshSequence, commentRefreshItemId, commentClient, activityClient, approvalClient, onUpdate, onCreateSubtask }: Props): ReactElement | null => {
    const [isEditingDescription, setIsEditingDescription] = useState(false)
    const [draftDescription, setDraftDescription] = useState(item.description)
    const [subtaskTitle, setSubtaskTitle] = useState('')
    const [checklistDraft, setChecklistDraft] = useState('')
    const [tagDraft, setTagDraft] = useState('')
    const [approvalFeedback, setApprovalFeedback] = useState(item.approvalFeedback ?? '')
    const [timeEntryDraft, setTimeEntryDraft] = useState('')
    const [approvalBusy, setApprovalBusy] = useState(false)
    const [approvalMessage, setApprovalMessage] = useState('')

    useEffect(() => { setApprovalFeedback(item.approvalFeedback ?? '') }, [item.id, item.approvalFeedback])

    const saveDescription = (): void => {
        const description = draftDescription.trim()
        onUpdate(item.id, { description })
        setDraftDescription(description)
        setIsEditingDescription(false)
    }

    const sendApprovalRequest = (): void => {
        const email = item.clientRequest?.contactEmail
        if (!email) return
        setApprovalBusy(true)
        setApprovalMessage('')
        void approvalClient.request(item.id)
            .then(() => { setApprovalMessage(`Review link sent to ${email}.`) })
            .catch((error: unknown) => { setApprovalMessage(error instanceof Error ? error.message : 'Could not send the approval link.') })
            .finally(() => { setApprovalBusy(false) })
    }

    const logTime = (): void => {
        const minutes = Number(timeEntryDraft)
        if (!Number.isSafeInteger(minutes) || minutes < 1) return
        onUpdate(item.id, { timeSpentMinutes: (item.timeSpentMinutes ?? 0) + minutes })
        setTimeEntryDraft('')
    }

    const addSubtask = (): void => {
        if (subtaskTitle.trim()) onCreateSubtask(item.id, subtaskTitle.trim())
        setSubtaskTitle('')
    }

    const dependencyCandidates = availableItems.filter((candidate) => candidate.id !== item.id && candidate.listId === item.listId && !candidate.parentId)
    if (!expanded) return null

    return <div className="mt-3 grid gap-4 border-t border-slate-100 pt-3 text-sm sm:grid-cols-3">
        <WorkItemExpandedCorePanels
            approvalBusy={approvalBusy}
            approvalFeedback={approvalFeedback}
            approvalMessage={approvalMessage}
            canEdit={canEdit}
            draftDescription={isEditingDescription ? draftDescription : null}
            item={item}
            lists={lists}
            onApprovalFeedbackChange={setApprovalFeedback}
            onCancelDescription={() => { setDraftDescription(item.description); setIsEditingDescription(false) }}
            onCreateSubtask={addSubtask}
            onDraftDescriptionChange={setDraftDescription}
            onEditDescription={() => { setDraftDescription(item.description); setIsEditingDescription(true) }}
            onLogTime={logTime}
            onSaveDescription={saveDescription}
            onSendApproval={sendApprovalRequest}
            onSubtaskTitleChange={setSubtaskTitle}
            onTimeEntryChange={setTimeEntryDraft}
            onUpdate={onUpdate}
            subtaskTitle={subtaskTitle}
            timeEntryDraft={timeEntryDraft}
        />
        <WorkItemExpandedOrganizationPanels
            canEdit={canEdit}
            checklistDraft={checklistDraft}
            dependencyCandidates={dependencyCandidates}
            item={item}
            onChecklistDraftChange={setChecklistDraft}
            onTagDraftChange={setTagDraft}
            onUpdate={onUpdate}
            tagDraft={tagDraft}
        />
        <WorkItemComments canComment={canEdit} commentClient={commentClient} itemId={item.id} refreshItemId={commentRefreshItemId} refreshSequence={commentRefreshSequence} />
        <WorkItemActivityFeed client={activityClient} itemId={item.id} refreshItemId={commentRefreshItemId} refreshSequence={commentRefreshSequence} />
    </div>
}
