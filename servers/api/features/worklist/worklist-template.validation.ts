import { z } from 'zod'

const statuses = z
    .array(z.string().trim().min(1).max(40))
    .min(2)
    .max(12)
    .refine((values) => new Set(values.map((value) => value.toLocaleLowerCase())).size === values.length, 'Status names must be unique.')
const task = z
    .object({
        title: z.string().trim().min(1).max(200),
        description: z.string().trim().max(2000).default(''),
        status: z.string().trim().min(1).max(40),
        priority: z.enum(['Low', 'Medium', 'High']),
        dueDateOffsetDays: z.number().int().min(0).max(3650)
    })
    .strict()

export const saveWorklistTemplateSchema = z
    .object({
        name: z.string().trim().min(1).max(80),
        description: z.string().trim().max(500).default(''),
        statuses,
        tasks: z.array(task).max(50)
    })
    .strict()
    .superRefine((template, context) => {
        for (const [index, item] of template.tasks.entries()) {
            if (!template.statuses.includes(item.status))
                context.addIssue({
                    code: 'custom',
                    path: ['tasks', index, 'status'],
                    message: "Task status must belong to this template's workflow."
                })
        }
    })

export type SaveWorklistTemplateInput = z.infer<typeof saveWorklistTemplateSchema>
