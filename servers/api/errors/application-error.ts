import { ApplicationError } from './types.js'
import type { ApiErrorDetails } from '@workspace/types'

type ApplicationErrorInput = Readonly<{
    code: ApplicationError['code']
    message: string
    status: ApplicationError['status']
    details?: ApiErrorDetails | undefined
}>

export const createApplicationError = (input: ApplicationErrorInput): ApplicationError => new ApplicationError(input)

export const isApplicationError = (error: unknown): error is ApplicationError => error instanceof ApplicationError
