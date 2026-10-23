export { defaultWorkItemColumnWidths, filterWorkItems, groupWorkItems, sortWorkItems, workItemStatuses } from '@workspace/worklist-ui'
export type {
    SavedViewOption,
    WorkItem,
    WorkItemColumn,
    WorkItemColumnWidths,
    WorkItemFilter,
    WorkItemPriority,
    WorkItemSortField,
    WorkItemStatus,
    WorklistComment,
    WorklistCommentClient,
    WorkItemActivity,
    WorkItemActivityClient,
    WorkItemClientRequest,
    WorklistGroup,
    WorklistListOption
} from '@workspace/worklist-ui'

import type { WorkItem } from '@workspace/worklist-ui'

// Stable fixtures are app-owned so the UI library never ships product demo data.
export const initialWorkItems: readonly WorkItem[] = [
    {
        id: 'WI-104',
        title: 'Review onboarding flow',
        description: '',
        status: 'In progress',
        priority: 'High',
        assignee: 'Sarah Chen',
        dueDate: '2026-10-16'
    },
    {
        id: 'WI-103',
        title: 'Prepare Q4 launch checklist',
        description: '',
        status: 'To do',
        priority: 'High',
        assignee: 'Ahmed Khan',
        dueDate: '2026-10-18'
    },
    {
        id: 'WI-102',
        title: 'Update customer help center',
        description: '',
        status: 'To do',
        priority: 'Medium',
        assignee: 'Maya Patel',
        dueDate: '2026-10-21'
    },
    {
        id: 'WI-101',
        title: 'Fix invite email layout',
        description: '',
        status: 'Done',
        priority: 'Low',
        assignee: 'Sarah Chen',
        dueDate: '2026-10-12'
    },
    {
        id: 'WI-100',
        title: 'Document workspace roles',
        description: '',
        status: 'In progress',
        priority: 'Medium',
        assignee: 'Unassigned',
        dueDate: '2026-10-20'
    },
    { id: 'WI-099', title: 'Audit empty states', description: '', status: 'To do', priority: 'Low', assignee: 'Ahmed Khan', dueDate: '2026-10-24' },
    {
        id: 'WI-098',
        title: 'Publish release notes',
        description: '',
        status: 'Done',
        priority: 'Medium',
        assignee: 'Maya Patel',
        dueDate: '2026-10-11'
    }
]
