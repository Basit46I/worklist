import path from 'node:path'
import { readJsonFile } from '../utilities/fs.mjs'

export const architectureFileName = 'architecture.yaml'

export const readArchitecture = async (workspaceRoot) => {
    const filePath = path.join(workspaceRoot, architectureFileName)

    try {
        return await readJsonFile(filePath)
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        throw new Error(`Unable to load architecture policy: ${message}`)
    }
}

export const createArchitectureContext = (architecture) => {
    const foundation = architecture?.foundation ?? {}
    const asArray = (value) => (Array.isArray(value) ? value : [])
    const projectRootConfiguration =
        foundation.projectRoots && typeof foundation.projectRoots === 'object' && !Array.isArray(foundation.projectRoots)
            ? foundation.projectRoots
            : {}
    return {
        ignoredDirectories: new Set(asArray(foundation.ignoredDirectories)),
        projectTypeByRoot: projectRootConfiguration,
        projectRoots: Object.keys(projectRootConfiguration),
        requiredRoots: asArray(foundation.requiredRoots),
        requiredFiles: asArray(foundation.requiredFiles)
    }
}

import { validateArchitectureFoundation } from './architecture-validation-foundation.mjs'
import { validateArchitectureTooling } from './architecture-validation-tooling.mjs'
import { validateArchitectureUiAndPackages } from './architecture-validation-ui.mjs'
import { validateArchitecturePlatform } from './architecture-validation-platform.mjs'

export const validateArchitectureConfiguration = (architecture) => {
    const issues = []
    if (!architecture || typeof architecture !== 'object') return [{ level: 'error', message: 'Architecture policy must be an object.' }]
    if (!Number.isInteger(architecture.version) || architecture.version < 1) issues.push({ level: 'error', message: 'Architecture policy requires a positive integer version.' })
    if (!architecture.foundation || typeof architecture.foundation !== 'object') {
        issues.push({ level: 'error', message: 'Architecture policy is missing foundation configuration.' })
        return issues
    }
    validateArchitectureFoundation(architecture, issues)
    validateArchitectureTooling(architecture, issues)
    validateArchitectureUiAndPackages(architecture, issues)
    validateArchitecturePlatform(architecture, issues)
    return issues
}
