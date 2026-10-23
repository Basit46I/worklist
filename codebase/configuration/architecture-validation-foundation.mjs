import path from 'node:path'

export const validateArchitectureFoundation = (architecture, issues) => {
    const roots = architecture.foundation.projectRoots
    if (!roots || typeof roots !== 'object' || Array.isArray(roots)) {
        issues.push({ level: 'error', message: 'Architecture policy requires a projectRoots object.' })
    } else {
        for (const [root, type] of Object.entries(roots)) {
            if (!root || root.includes('..') || path.isAbsolute(root)) {
                issues.push({ level: 'error', message: `Invalid workspace unit root: ${root || '(empty)'}.` })
            }
            if (!['app', 'server', 'package', 'prebuilt', 'config'].includes(type)) {
                issues.push({ level: 'error', message: `Workspace unit root ${root} has invalid type ${type}.` })
            }
        }
    }
    const allowedProjectTypesByRoot = architecture.foundation.allowedProjectTypesByRoot
    if (!allowedProjectTypesByRoot || typeof allowedProjectTypesByRoot !== 'object' || Array.isArray(allowedProjectTypesByRoot)) {
        issues.push({ level: 'error', message: 'Architecture policy requires an allowedProjectTypesByRoot object.' })
    } else {
        for (const [root, types] of Object.entries(allowedProjectTypesByRoot)) {
            if (
                !Array.isArray(types) ||
                types.length === 0 ||
                types.some((type) => !['app', 'server', 'package', 'prebuilt', 'config'].includes(type))
            ) {
                issues.push({ level: 'error', message: `Workspace unit root ${root} has invalid allowed project types.` })
            }
        }
    }
    for (const field of ['requiredRoots', 'requiredFiles', 'ignoredDirectories', 'disallowedOrchestrators']) {
        const value = architecture.foundation[field]
        if (value !== undefined && !Array.isArray(value)) {
            issues.push({ level: 'error', message: `Architecture foundation.${field} must be an array.` })
        }
    }
    if (!architecture.boundaries || typeof architecture.boundaries !== 'object') {
        issues.push({ level: 'error', message: 'Architecture policy is missing boundary configuration.' })
    }
}
