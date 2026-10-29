import { z } from 'zod'

export const createWorklistSpaceSchema = z.object({
    name: z.string().trim().min(1).max(80),
    description: z.string().trim().max(500).default('')
}).strict()

export const createWorklistFolderSchema = z.object({
    name: z.string().trim().min(1).max(80)
}).strict()
