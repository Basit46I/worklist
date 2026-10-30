import { z } from 'zod'

const status = z.string().trim().min(1).max(40)
const priority = z.enum(['Low', 'Medium', 'High'])
const dateOnly = z.iso.date().transform((value) => new Date(`${value}T00:00:00.000Z`))
const checklist = z
    .array(z.object({ id: z.string().trim().min(1).max(80), text: z.string().trim().min(1).max(240), completed: z.boolean() }).strict())
    .max(50)
    .refine((entries) => new Set(entries.map((entry) => entry.id)).size === entries.length, 'Checklist IDs must be unique.')
const dependsOn = z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(50).refine((ids) => new Set(ids).size === ids.length, 'Dependencies must be unique.')
const recurrence = z.object({ frequency: z.enum(['daily', 'weekly', 'monthly']), interval: z.number().int().min(1).max(52) }).strict().nullable()
const tags = z.array(z.string().trim().min(1).max(32)).max(20).refine((values) => new Set(values.map((value) => value.toLocaleLowerCase())).size === values.length, 'Tags must be unique.')
const clientRequest = z.object({ contactName: z.string().trim().min(1).max(120), contactEmail: z.email().max(254), request: z.string().trim().min(1).max(2000) }).strict().nullable()
const listFilterSchema = z
    .object({
        field: z.enum(['status', 'priority', 'assignee', 'dueDate']),
        operator: z.enum(['equals', 'contains', 'before', 'after']),
        value: z.string().max(120)
    })
    .strict()
    .refine(
        (filter) =>
            filter.field === 'dueDate'
                ? (filter.operator === 'equals' || filter.operator === 'before' || filter.operator === 'after') &&
                  z.iso.date().safeParse(filter.value).success
                : filter.field === 'assignee'
                  ? filter.operator === 'equals' || filter.operator === 'contains'
                  : filter.operator === 'equals',
        'The filter operator or value is not supported for this field.'
    )
const cursorPayloadSchema = z
    .object({
        value: z.union([z.string().max(254), z.iso.date()]),
        id: z.string().regex(/^[a-f\d]{24}$/i),
        field: z.enum(['title', 'status', 'priority', 'assignee', 'dueDate']),
        direction: z.enum(['asc', 'desc'])
    })
    .strict()
const cursorSchema = z
    .string()
    .min(1)
    .max(512)
    .regex(/^[A-Za-z\d_-]+$/)
    .transform((value, context) => {
        try {
            const decoded: unknown = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
            const result = cursorPayloadSchema.safeParse(decoded)
            if (result.success) return result.data
        } catch {
            // Invalid cursors are rejected below using the same public validation error.
        }
        context.addIssue({ code: 'custom', message: 'Cursor is invalid.' })
        return z.NEVER
    })

export const workItemListQuerySchema = z
    .object({
        limit: z.coerce.number().int().min(1).max(100).default(50),
        cursor: cursorSchema.optional(),
        search: z.string().trim().max(100).default(''),
        status: z.string().trim().min(1).max(40).default('All'),
        listId: z
            .string()
            .regex(/^[a-f\d]{24}$/i)
            .optional(),
        sortField: z.enum(['title', 'status', 'priority', 'assignee', 'dueDate']).default('dueDate'),
        sortDirection: z.enum(['asc', 'desc']).default('asc'),
        filterLogic: z.enum(['AND', 'OR']).default('AND'),
        filters: z
            .string()
            .max(2_000)
            .default('[]')
            .transform((value, context) => {
                try {
                    const decoded: unknown = JSON.parse(value)
                    const result = z.array(listFilterSchema).max(10).safeParse(decoded)
                    if (result.success) return result.data
                } catch {
                    // Invalid filter JSON is rejected below with a stable validation error.
                }
                context.addIssue({ code: 'custom', message: 'Filters must be a valid list of at most 10 conditions.' })
                return z.NEVER
            }),
        includeArchived: z.enum(['true', 'false']).default('false').transform((value) => value === 'true')
    })
    .strict()
    .superRefine((query, context) => {
        if (!query.cursor) return
        if (query.cursor.field !== query.sortField || query.cursor.direction !== query.sortDirection) {
            context.addIssue({ code: 'custom', message: 'Cursor does not match the requested sort.' })
        }
        if (query.sortField === 'dueDate' && !z.iso.date().safeParse(query.cursor.value).success) {
            context.addIssue({ code: 'custom', message: 'Cursor date is invalid.' })
        }
    })

export const createWorkItemSchema = z
    .object({
        listId: z
            .string()
            .regex(/^[a-f\d]{24}$/i)
            .optional(),
        parentId: z
            .string()
            .regex(/^[a-f\d]{24}$/i)
            .optional(),
        title: z.string().trim().min(1).max(200),
        description: z.string().trim().max(2000).default(''),
        status: status.default('To do'),
        priority: priority.default('Medium'),
        assignee: z.string().trim().max(254).default('Unassigned'),
        startDate: dateOnly.optional(),
        dueDate: dateOnly,
        checklist: checklist.default([]),
        dependsOn: dependsOn.default([]),
        recurrence: recurrence.default(null),
        tags: tags.default([]),
        clientRequest: clientRequest.default(null),
        approvalStatus: z.enum(['not_requested', 'pending', 'approved', 'changes_requested']).default('not_requested'),
        approvalFeedback: z.string().trim().max(2000).default(''),
        timeSpentMinutes: z.number().int().min(0).max(10_000_000).default(0)
    })
    .strict()

export const updateWorkItemSchema = createWorkItemSchema.partial().strict()
export const bulkDeleteWorkItemsSchema = z
    .object({
        itemIds: z
            .array(z.string().regex(/^[a-f\d]{24}$/i))
            .min(1)
            .max(100)
            .refine((ids) => new Set(ids).size === ids.length, 'Item IDs must be unique.')
    })
    .strict()
export const bulkUpdateWorkItemsSchema = z
    .object({
        itemIds: z
            .array(z.string().regex(/^[a-f\d]{24}$/i))
            .min(1)
            .max(100)
            .refine((ids) => new Set(ids).size === ids.length, 'Item IDs must be unique.'),
        changes: z
            .object({
                status: status.optional(),
                listId: z
                    .string()
                    .regex(/^[a-f\d]{24}$/i)
                    .optional(),
                priority: priority.optional(),
                assignee: z.string().trim().min(1).max(254).optional(),
                dueDate: dateOnly.optional()
            })
            .strict()
            .refine((changes) => Object.keys(changes).length > 0, 'Choose a field to update.')
    })
    .strict()

export type CreateWorkItemInput = z.infer<typeof createWorkItemSchema>
export type UpdateWorkItemInput = z.infer<typeof updateWorkItemSchema>
export type WorkItemListQuery = z.infer<typeof workItemListQuerySchema>
