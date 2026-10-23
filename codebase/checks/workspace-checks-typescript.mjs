import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { pathExists, readJsonFile, walkFiles } from '../utilities/fs.mjs'

const typeScriptExtensions = new Set(['.ts', '.tsx', '.mts', '.cts'])
const explicitAnyPatterns = [
    /:\s*any\b/,
    /\bas\s+any\b/,
    /=\s*any\b/,
    /<\s*any\s*>/,
    /\bany\s*\[\s*\]/,
    /\b(?:Array|Promise|ReadonlyArray|Record)\s*<[^>\n]*\bany\b/
]

export const checkTypeScriptConfiguration = async (workspace) => {
    const policy = workspace.architecture.typescript ?? {}
    const requiredOptions = policy.requiredCompilerOptions ?? []
    const forbiddenOptions = policy.forbiddenCompilerOptions ?? []
    const ignoredDirectories = new Set(workspace.architecture.foundation?.ignoredDirectories ?? [])
    const sharedConfigProjectName = policy.sharedConfigProject
    const sharedConfigProject = workspace.projects.find((project) => project.name === sharedConfigProjectName)
    const usesSharedPolicy = typeof sharedConfigProjectName === 'string'
    const sharedIssues = []

    if (usesSharedPolicy && (!sharedConfigProject || sharedConfigProject.type !== 'config')) {
        sharedIssues.push({
            level: 'error',
            message: `TypeScript shared config project ${sharedConfigProjectName} must be registered as type config.`
        })
    }
    if (sharedConfigProject) {
        const sharedConfigRoot = path.join(workspace.root, sharedConfigProject.root)
        const policyConfigFile = policy.policyConfigFile ?? 'base.json'
        const policyConfigPath = path.join(sharedConfigRoot, policyConfigFile)
        if (!(await pathExists(policyConfigPath))) {
            sharedIssues.push({
                level: 'error',
                message: `TypeScript policy config is missing: ${path.relative(workspace.root, policyConfigPath).split(path.sep).join('/')}.`
            })
        } else {
            const policyConfig = await readJsonFile(policyConfigPath)
            const compilerOptions = policyConfig.compilerOptions ?? {}
            for (const option of requiredOptions) {
                if (compilerOptions[option] !== true) {
                    sharedIssues.push({ level: 'error', message: `Shared TypeScript policy must enable compilerOptions.${option}.` })
                }
            }
            for (const option of forbiddenOptions) {
                if (compilerOptions[option] !== undefined) {
                    sharedIssues.push({ level: 'error', message: `Shared TypeScript policy must not set compilerOptions.${option}.` })
                }
            }
        }
        for (const presetFile of policy.presetConfigFiles ?? []) {
            const presetPath = path.join(sharedConfigRoot, presetFile)
            if (!(await pathExists(presetPath))) {
                sharedIssues.push({ level: 'error', message: `Shared TypeScript preset is missing: ${presetFile}.` })
                continue
            }
            const preset = await readJsonFile(presetPath)
            if (preset.extends !== `./${policyConfigFile}`) {
                sharedIssues.push({ level: 'error', message: `Shared TypeScript preset ${presetFile} must extend ./${policyConfigFile}.` })
            }
            for (const option of forbiddenOptions) {
                if (preset.compilerOptions?.[option] !== undefined) {
                    sharedIssues.push({ level: 'error', message: `Shared TypeScript preset ${presetFile} must not set compilerOptions.${option}.` })
                }
            }
        }
    }

    const projectResults = await Promise.all(
        workspace.projects.map(async (project) => {
            const projectRoot = path.join(workspace.root, project.root)
            const files = await walkFiles(projectRoot, { ignoredDirectories })
            const hasTypeScript = files.some((file) => typeScriptExtensions.has(path.extname(file)))
            if (!hasTypeScript) return []

            const tsconfigPath = path.join(projectRoot, 'tsconfig.json')
            if (!(await pathExists(tsconfigPath))) {
                return [{ level: 'error', message: `${project.name} contains TypeScript but has no tsconfig.json.` }]
            }

            const tsconfig = await readJsonFile(tsconfigPath)
            const compilerOptions = tsconfig.compilerOptions ?? {}
            const expectedExtends = policy.approvedExtendsByProjectType?.[project.type]
            const inheritanceIssues =
                usesSharedPolicy && expectedExtends && tsconfig.extends !== expectedExtends
                    ? [{ level: 'error', message: `${project.name} tsconfig.json must extend ${expectedExtends}.` }]
                    : []
            const requiredOptionIssues = requiredOptions
                .filter((option) => (usesSharedPolicy ? compilerOptions[option] === false : compilerOptions[option] !== true))
                .map((option) => ({
                    level: 'error',
                    message: usesSharedPolicy
                        ? `${project.name} tsconfig.json must not disable compilerOptions.${option}.`
                        : `${project.name} tsconfig.json must explicitly enable compilerOptions.${option}.`
                }))
            const forbiddenOptionIssues = forbiddenOptions
                .filter((option) => compilerOptions[option] !== undefined)
                .map((option) => ({
                    level: 'error',
                    message: `${project.name} tsconfig.json must not set compilerOptions.${option}.`
                }))
            return [...inheritanceIssues, ...requiredOptionIssues, ...forbiddenOptionIssues]
        })
    )

    return [...sharedIssues, ...projectResults.flat()]
}


export const checkTypeScriptTaskCoverage = async (workspace) => {
    const ignoredDirectories = new Set(workspace.architecture.foundation?.ignoredDirectories ?? [])
    const projectResults = await Promise.all(
        workspace.projects.map(async (project) => {
            const projectRoot = path.join(workspace.root, project.root)
            const files = await walkFiles(projectRoot, { ignoredDirectories })
            const hasTypeScript = files.some((file) => typeScriptExtensions.has(path.extname(file)))
            if (!hasTypeScript) return []

            const issues = []
            for (const taskName of ['lint', 'typecheck']) {
                if (!project.tasks?.some((task) => task.name === taskName)) {
                    issues.push({ level: 'error', message: `${project.name} contains TypeScript but has no ${taskName} task.` })
                }
            }
            if (!(await pathExists(path.join(projectRoot, 'eslint.config.mjs')))) {
                issues.push({ level: 'error', message: `${project.name} contains TypeScript but has no eslint.config.mjs.` })
            }
            return issues
        })
    )

    return projectResults.flat()
}

export const checkTypeScriptArchitecture = async (workspace) => {
    const ignoredDirectories = new Set(workspace.architecture.foundation?.ignoredDirectories ?? [])
    const typeBoundaryProjectTypes = workspace.architecture.typescript?.requiredTypeBoundaryProjectTypes ?? []
    const disallowExplicitAny = workspace.architecture.typescript?.disallowExplicitAny === true
    const configurationPolicy = workspace.architecture.configuration ?? {}
    const projectResults = await Promise.all(
        workspace.projects.map(async (project) => {
            const projectRoot = path.join(workspace.root, project.root)
            const files = (await walkFiles(projectRoot, { ignoredDirectories })).filter((file) => typeScriptExtensions.has(path.extname(file)))
            if (files.length === 0) return []

            const issues = []
            if (typeBoundaryProjectTypes.includes(project.type)) {
                const typeIndex = path.join(projectRoot, 'types', 'index.ts')
                if (!(await pathExists(typeIndex))) {
                    issues.push({ level: 'error', message: `${project.name} requires a types/index.ts architectural type boundary.` })
                }
            }

            for (const file of files) {
                const source = await readFile(file, 'utf8')
                const relative = path.relative(workspace.root, file).split(path.sep).join('/')
                if (disallowExplicitAny && explicitAnyPatterns.some((pattern) => pattern.test(source))) {
                    issues.push({ level: 'error', message: `${relative} uses an explicit any type.` })
                }

                const projectRelative = path.relative(projectRoot, file).split(path.sep).join('/')
                if (
                    projectRelative === configurationPolicy.environmentValidationFile &&
                    configurationPolicy.forbidDefaultsInEnvironmentValidation === true &&
                    /\.default\s*\(/.test(source)
                ) {
                    issues.push({
                        level: 'error',
                        message: `${relative} embeds a default in environment validation; runtime values must come from the environment.`
                    })
                }

                const isConfigFile = projectRelative.startsWith('config/')
                const importsValidationPackage = (configurationPolicy.validationPackages ?? []).some((packageName) =>
                    new RegExp(`from\\s+["']${packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`).test(source)
                )
                if (isConfigFile && importsValidationPackage) {
                    issues.push({ level: 'error', message: `${relative} owns runtime validation inside config; move schemas to validation/.` })
                }
            }

            return issues
        })
    )

    return projectResults.flat()
}

