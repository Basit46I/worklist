import { mongoose } from '../../integrations/index.js'
import { WorklistTemplateModel } from './worklist-template.model.js'
import type { WorklistTemplateRecord } from './worklist-template.model.js'
import type { SaveWorklistTemplateInput } from './worklist-template.validation.js'

const serialize = (record: {
    _id: unknown
    name: string
    description: string
    statuses: readonly string[]
    tasks: readonly WorklistTemplateRecord['tasks'][number][]
}) => ({
    id: String(record._id),
    name: record.name,
    description: record.description,
    statuses: record.statuses,
    tasks: record.tasks
})

export const createWorklistTemplateRepository = () =>
    Object.freeze({
        list: async (teamId: string) => {
            const records = await WorklistTemplateModel.find({ teamId }).sort({ nameKey: 1, _id: 1 }).lean().exec()
            return records.map(serialize)
        },
        create: async (teamId: string, userId: string, input: SaveWorklistTemplateInput) => {
            const record = await WorklistTemplateModel.create({ ...input, teamId, createdBy: userId, nameKey: input.name.toLocaleLowerCase() })
            return serialize(record)
        },
        update: async (teamId: string, templateId: string, input: SaveWorklistTemplateInput) => {
            if (!mongoose.Types.ObjectId.isValid(templateId)) return null
            const record = await WorklistTemplateModel.findOneAndUpdate(
                { _id: templateId, teamId },
                { $set: { ...input, nameKey: input.name.toLocaleLowerCase() } },
                { new: true, runValidators: true }
            )
                .lean()
                .exec()
            return record ? serialize(record) : null
        },
        delete: async (teamId: string, templateId: string) => {
            if (!mongoose.Types.ObjectId.isValid(templateId)) return false
            const result = await WorklistTemplateModel.deleteOne({ _id: templateId, teamId }).exec()
            return result.deletedCount > 0
        }
    })
