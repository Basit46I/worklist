import { z } from 'zod'

export const publicClientRequestSchema = z.object({
    contactName: z.string().trim().min(1).max(120),
    contactEmail: z.email().max(254),
    title: z.string().trim().min(1).max(200),
    details: z.string().trim().min(1).max(2000),
    dueDate: z.iso.date().transform((value) => new Date(`${value}T00:00:00.000Z`)),
    website: z.string().max(200).optional()
}).strict()

export type PublicClientRequestInput = z.infer<typeof publicClientRequestSchema>
