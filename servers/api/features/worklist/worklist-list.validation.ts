import { z } from 'zod'

const columns = z
    .array(z.enum(['status', 'priority', 'assignee', 'dueDate']))
    .min(1)
    .max(4)
    .refine((values) => new Set(values).size === values.length, 'List columns must be unique.')
const settings = z
    .object({
        sortField: z.enum(['title', 'status', 'priority', 'assignee', 'dueDate']),
        sortDirection: z.enum(['asc', 'desc']),
        groupBy: z.enum(['Off', 'status', 'priority', 'assignee', 'dueDate']),
        visibleColumns: columns,
        columnWidths: z
            .object({
                status: z.number().int().min(100).max(480),
                priority: z.number().int().min(100).max(480),
                assignee: z.number().int().min(100).max(480),
                dueDate: z.number().int().min(100).max(480)
            })
            .strict(),
        statuses: z
            .array(z.string().trim().min(1).max(40))
            .min(2)
            .max(12)
            .refine((values) => new Set(values.map((value) => value.toLocaleLowerCase())).size === values.length, 'Status names must be unique.'),
        budgetMinutes: z.number().int().min(0).max(10_000_000).default(0)
    })
    .strict()

export const createWorklistListSchema = z
    .object({
        name: z.string().trim().min(1).max(80),
        description: z.string().trim().max(500).default(''),
        spaceName: z.string().trim().min(1).max(80).default('General'),
        folderName: z.string().trim().max(80).default(''),
        statuses: z
            .array(z.string().trim().min(1).max(40))
            .min(2)
            .max(12)
            .refine((values) => new Set(values.map((value) => value.toLocaleLowerCase())).size === values.length, 'Status names must be unique.')
            .default(['To do', 'In progress', 'Done']),
        budgetMinutes: z.number().int().min(0).max(10_000_000).default(0)
    })
    .strict()
export const updateWorklistListSchema = z
    .object({
        name: z.string().trim().min(1).max(80).optional(),
        description: z.string().trim().max(500).optional(),
        spaceName: z.string().trim().min(1).max(80).optional(),
        folderName: z.string().trim().max(80).optional(),
        settings: settings.optional()
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, 'Provide a list name or settings.')
export const worklistListsQuerySchema = z.object({ includeArchived: z.enum(['true', 'false']).default('false') }).strict()
export type WorklistListSettings = z.infer<typeof settings>
