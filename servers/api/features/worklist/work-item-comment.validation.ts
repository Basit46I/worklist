import { z } from 'zod'

export const createWorkItemCommentSchema = z
    .object({
        body: z.string().trim().min(1).max(2000)
    })
    .strict()

export type CreateWorkItemCommentInput = z.infer<typeof createWorkItemCommentSchema>
