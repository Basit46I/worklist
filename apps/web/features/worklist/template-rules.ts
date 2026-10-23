import type { WorklistTemplate } from './api'

export type TemplateInput = Omit<WorklistTemplate, 'id'>
export type TemplateDraftResult = Readonly<{ ok: true; input: TemplateInput }> | Readonly<{ ok: false; error: string }>

export const buildTemplateInput = (
    nameDraft: string,
    descriptionDraft: string,
    statusesDraft: string,
    tasksDraft: string,
    previous?: WorklistTemplate
): TemplateDraftResult => {
    const statuses = [...new Set(statusesDraft.split('\n').map((value) => value.trim()).filter(Boolean))]
    const titles = tasksDraft.split('\n').map((value) => value.trim()).filter(Boolean)
    if (statuses.length < 2 || statuses.length > 12) return { ok: false, error: 'A template needs 2 to 12 unique statuses.' }
    if (titles.length > 50) return { ok: false, error: 'A template can contain up to 50 starter tasks.' }

    return {
        ok: true,
        input: {
            name: nameDraft.trim(),
            description: descriptionDraft.trim(),
            statuses,
            tasks: titles.map((title, index) => {
                const priorTask = previous?.tasks[index]
                return {
                    title,
                    description: priorTask?.description ?? '',
                    status: priorTask && statuses.includes(priorTask.status) ? priorTask.status : (statuses[0] ?? 'To do'),
                    priority: priorTask?.priority ?? 'Medium',
                    dueDateOffsetDays: priorTask?.dueDateOffsetDays ?? Math.min(index + 1, 3650)
                }
            })
        }
    }
}
