import path from 'node:path'
import { pathExists, readJsonFile } from '../utilities/fs.mjs'

export const checkUiRegistryWorkflow = async (workspace) => {
    const policy = workspace.architecture.uiComposition ?? {}
    const project = workspace.projects.find((candidate) => candidate.name === policy.packageProject)
    if (!project) return [{ level: 'error', message: `UI package project ${policy.packageProject ?? '(missing)'} is not registered.` }]

    const issues = []
    const packageRoot = path.join(workspace.root, project.root)
    const packageJson = await readJsonFile(path.join(packageRoot, 'package.json'))
    const rootPackageJson = await readJsonFile(path.join(workspace.root, 'package.json'))
    const configPath = path.join(packageRoot, policy.registryConfig ?? 'components.json')
    const addScript = policy.registryAddScript ?? 'ui:add'
    const addAllScript = policy.registryAddAllScript ?? 'ui:add:all'
    const cliPackage = policy.registryCliPackage ?? 'shadcn'
    const catalogItems = policy.registryCatalogItems ?? []
    const catalogCommand = `${cliPackage} add ${catalogItems.join(' ')} --yes --overwrite && node scripts/reconcile-registry.mjs`

    if (!(await pathExists(configPath))) {
        issues.push({
            level: 'error',
            message: `UI registry configuration is missing: ${path.relative(workspace.root, configPath).split(path.sep).join('/')}.`
        })
    } else {
        const config = await readJsonFile(configPath)
        for (const [alias, target] of Object.entries(policy.registryAliases ?? {})) {
            if (config.aliases?.[alias] !== target) {
                issues.push({ level: 'error', message: `UI registry alias ${alias} must target ${target}.` })
            }
        }
    }
    if (packageJson.devDependencies?.[cliPackage] !== policy.registryCliVersion) {
        issues.push({ level: 'error', message: `${project.name} must pin ${cliPackage} to ${policy.registryCliVersion}.` })
    }
    if (packageJson.scripts?.[addScript] !== `${cliPackage} add`) {
        issues.push({ level: 'error', message: `${project.name} script ${addScript} must use the official ${cliPackage} add workflow.` })
    }
    if (packageJson.scripts?.[addAllScript] !== catalogCommand) {
        issues.push({ level: 'error', message: `${project.name} script ${addAllScript} must install the official registry catalog.` })
    }
    if (rootPackageJson.scripts?.[addScript] !== `pnpm --dir ${project.root} run ${addScript}`) {
        issues.push({ level: 'error', message: `Root script ${addScript} must delegate to the UI package.` })
    }
    if (rootPackageJson.scripts?.[addAllScript] !== `pnpm --dir ${project.root} run ${addAllScript}`) {
        issues.push({ level: 'error', message: `Root script ${addAllScript} must delegate to the UI package.` })
    }
    for (const item of catalogItems) {
        const componentPath = path.join(packageRoot, policy.primitiveRoot ?? 'src/primitives', `${item}.tsx`)
        if (!(await pathExists(componentPath))) {
            issues.push({ level: 'error', message: `UI registry catalog item ${item} is not installed under the primitive root.` })
        }
    }
    return issues
}

