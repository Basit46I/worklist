import { z } from 'zod'

export const savedViewStateSchema = z
    .object({
        listId: z
            .string()
            .regex(/^[a-f\d]{24}$/i)
            .optional(),
        search: z.string().max(100),
        statusFilter: z.string().trim().min(1).max(40),
        sortField: z.enum(['title', 'status', 'priority', 'assignee', 'dueDate']),
        sortDirection: z.enum(['asc', 'desc']),
        groupBy: z.enum(['Off', 'status', 'priority', 'assignee', 'dueDate']),
        visibleColumns: z
            .array(z.enum(['status', 'priority', 'assignee', 'dueDate']))
            .max(4)
            .refine((columns) => new Set(columns).size === columns.length, 'Columns must be unique.'),
        filters: z
            .array(
                z
                    .object({
                        field: z.enum(['status', 'priority', 'assignee', 'dueDate']),
                        operator: z.enum(['equals', 'contains', 'before', 'after']),
                        value: z.string().max(120)
                    })
                    .strict()
            )
            .max(10)
            .refine(
                (filters) =>
                    filters.every((filter) =>
                        filter.field === 'dueDate'
                            ? (filter.operator === 'equals' || filter.operator === 'before' || filter.operator === 'after') &&
                              z.iso.date().safeParse(filter.value).success
                            : filter.field === 'assignee'
                              ? filter.operator === 'equals' || filter.operator === 'contains'
                              : filter.operator === 'equals'
                    ),
                'The filter operator or value is not supported for this field.'
            ),
        filterLogic: z.enum(['AND', 'OR']),
        columnWidths: z.record(z.enum(['status', 'priority', 'assignee', 'dueDate']), z.number().int().min(100).max(480)).optional()
    })
    .strict()

export const createSavedViewSchema = z
    .object({
        name: z.string().trim().min(1).max(60),
        visibility: z.enum(['private', 'team']).default('private'),
        state: savedViewStateSchema
    })
    .strict()

export type SavedViewState = z.infer<typeof savedViewStateSchema>
