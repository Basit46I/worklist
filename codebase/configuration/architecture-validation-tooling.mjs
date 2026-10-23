export const validateArchitectureTooling = (architecture, issues) => {
    const toolingModel = architecture.toolingModel
    if (!toolingModel || toolingModel.principle !== 'custom-orchestration-standard-engines') {
        issues.push({ level: 'error', message: 'Architecture policy must separate custom repository orchestration from standard technical engines.' })
    } else {
        for (const [capability, engine] of Object.entries({
            packageManagement: 'pnpm',
            typescript: 'tsc',
            lint: 'eslint',
            tests: 'project-declared-runner',
            dependencySecurity: 'pnpm-audit',
            secretDetection: 'trufflehog'
        })) {
            if (toolingModel.standardEngines?.[capability] !== engine) {
                issues.push({ level: 'error', message: `Architecture tooling model must delegate ${capability} to ${engine}.` })
            }
        }
    }
    if (!Array.isArray(architecture.typescript?.requiredCompilerOptions)) {
        issues.push({ level: 'error', message: 'Architecture policy requires a typescript.requiredCompilerOptions array.' })
    }
    if (!Array.isArray(architecture.typescript?.forbiddenCompilerOptions)) {
        issues.push({ level: 'error', message: 'Architecture policy requires a typescript.forbiddenCompilerOptions array.' })
    }
    if (!Array.isArray(architecture.typescript?.requiredTypeBoundaryProjectTypes)) {
        issues.push({ level: 'error', message: 'Architecture policy requires a typescript.requiredTypeBoundaryProjectTypes array.' })
    }
    if (
        typeof architecture.typescript?.sharedConfigProject !== 'string' ||
        typeof architecture.typescript?.policyConfigFile !== 'string' ||
        !Array.isArray(architecture.typescript?.presetConfigFiles) ||
        !architecture.typescript?.approvedExtendsByProjectType ||
        typeof architecture.typescript.approvedExtendsByProjectType !== 'object' ||
        Array.isArray(architecture.typescript.approvedExtendsByProjectType)
    ) {
        issues.push({
            level: 'error',
            message: 'Architecture TypeScript policy must identify its shared config project, policy file, and approved inheritance.'
        })
    }
    if (!architecture.configuration || typeof architecture.configuration !== 'object') {
        issues.push({ level: 'error', message: 'Architecture policy is missing configuration-boundary rules.' })
    } else {
        if (typeof architecture.configuration.environmentValidationFile !== 'string') {
            issues.push({ level: 'error', message: 'Architecture configuration requires an environmentValidationFile path.' })
        }
        if (!Array.isArray(architecture.configuration.validationPackages)) {
            issues.push({ level: 'error', message: 'Architecture configuration.validationPackages must be an array.' })
        }
    }
}
