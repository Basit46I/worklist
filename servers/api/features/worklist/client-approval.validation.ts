import { z } from 'zod'

export const clientApprovalDecisionSchema = z.object({
    decision: z.enum(['approved', 'changes_requested']),
    feedback: z.string().trim().max(2000).default('')
}).strict().refine((value) => value.decision !== 'changes_requested' || value.feedback.length > 0, 'Please describe the changes you need.')
