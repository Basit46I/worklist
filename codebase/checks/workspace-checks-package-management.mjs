import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { pathExists, readJsonFile } from '../utilities/fs.mjs'

const readPnpmWorkspacePatterns = (source) => {
    const packageBlock = source.match(/^packages:[ \t]*\r?\n((?:[ \t]{2,}.*(?:\r?\n|$))*)/m)?.[1] ?? ''
    return [...packageBlock.matchAll(/^[ \t]*-[ \t]*["']?([^"'\r\n]+)["']?[ \t]*$/gm)].map((match) => match[1])
}

const readPnpmAllowedBuilds = (source) => {
    const allowBuildsBlock = source.match(/^allowBuilds:[ \t]*\r?\n((?:[ \t]{2,}.*(?:\r?\n|$))*)/m)?.[1] ?? ''
    return [...allowBuildsBlock.matchAll(/^[ \t]{2,}([^:\r\n]+):[ \t]*true[ \t]*$/gm)].map((match) => match[1].trim())
}

export const checkPackageManagerArchitecture = async (workspace) => {
    const policy = workspace.architecture.packageManagement ?? {}
    const issues = []
    const rootPackagePath = path.join(workspace.root, 'package.json')
    const rootPackage = await readJsonFile(rootPackagePath)
    const expectedPackageManager = `${policy.manager}@${policy.packageManagerVersion}`

    if (rootPackage.packageManager !== expectedPackageManager) {
        issues.push({ level: 'error', message: `Root package.json must declare packageManager ${expectedPackageManager}.` })
    }
    if (rootPackage.workspaces !== undefined) {
        issues.push({
            level: 'error',
            message: 'Root package.json contains a stale npm workspaces field; pnpm-workspace.yaml owns workspace discovery.'
        })
    }
    for (const [name, command] of Object.entries(rootPackage.scripts ?? {})) {
        if (/\bnpm(?:\.cmd)?\b/.test(command)) {
            issues.push({ level: 'error', message: `Root script ${name} contains a stale npm command.` })
        }
    }

    const workspaceFilePath = path.join(workspace.root, policy.workspaceFile ?? 'pnpm-workspace.yaml')
    if (!(await pathExists(workspaceFilePath))) {
        issues.push({ level: 'error', message: `Missing pnpm workspace file: ${policy.workspaceFile ?? 'pnpm-workspace.yaml'}.` })
    } else {
        const workspaceSource = await readFile(workspaceFilePath, 'utf8')
        const actualPatterns = readPnpmWorkspacePatterns(workspaceSource)
        const expectedPatterns = policy.workspacePatterns ?? []
        if (actualPatterns.length !== expectedPatterns.length || expectedPatterns.some((pattern) => !actualPatterns.includes(pattern))) {
            issues.push({ level: 'error', message: 'pnpm-workspace.yaml patterns do not match architecture.packageManagement.workspacePatterns.' })
        }
        const actualAllowedBuilds = readPnpmAllowedBuilds(workspaceSource)
        const expectedAllowedBuilds = policy.allowedBuildDependencies ?? []
        if (
            actualAllowedBuilds.length !== expectedAllowedBuilds.length ||
            expectedAllowedBuilds.some((dependency) => !actualAllowedBuilds.includes(dependency))
        ) {
            issues.push({
                level: 'error',
                message: 'pnpm-workspace.yaml allowBuilds does not match architecture.packageManagement.allowedBuildDependencies.'
            })
        }
    }

    if (!(await pathExists(path.join(workspace.root, policy.lockfile ?? 'pnpm-lock.yaml')))) {
        issues.push({ level: 'error', message: `Missing pnpm lockfile: ${policy.lockfile ?? 'pnpm-lock.yaml'}.` })
    }
    for (const lockfile of policy.forbiddenLockfiles ?? []) {
        if (await pathExists(path.join(workspace.root, lockfile))) {
            issues.push({ level: 'error', message: `Conflicting package-manager lockfile exists: ${lockfile}.` })
        }
    }

    const packageMetadata = new Map()
    for (const project of workspace.projects) {
        const packagePath = path.join(workspace.root, project.root, 'package.json')
        if (await pathExists(packagePath)) packageMetadata.set(project.name, await readJsonFile(packagePath))
        for (const task of project.tasks ?? []) {
            if (task.command && !task.command.startsWith('pnpm ')) {
                issues.push({ level: 'error', message: `${project.name}:${task.name} must execute through pnpm.` })
            }
        }
    }

    const packageNameByProject = new Map(
        [...packageMetadata].flatMap(([projectName, packageJson]) => (typeof packageJson.name === 'string' ? [[projectName, packageJson.name]] : []))
    )
    for (const project of workspace.projects) {
        const packageJson = packageMetadata.get(project.name)
        if (!packageJson) continue
        const dependencyEntries = Object.assign(
            {},
            packageJson.dependencies ?? {},
            packageJson.devDependencies ?? {},
            packageJson.optionalDependencies ?? {}
        )
        for (const dependencyProject of project.internalDependencies ?? []) {
            const dependencyPackageName = packageNameByProject.get(dependencyProject)
            const version = dependencyPackageName ? dependencyEntries[dependencyPackageName] : undefined
            if (typeof version !== 'string' || !version.startsWith(policy.internalDependencyProtocol ?? 'workspace:')) {
                issues.push({
                    level: 'error',
                    message: `${project.name} must declare internal dependency ${dependencyPackageName ?? dependencyProject} using ${policy.internalDependencyProtocol ?? 'workspace:'}.`
                })
            }
        }
    }

    return issues
}

