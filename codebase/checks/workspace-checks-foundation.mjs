import path from 'node:path'
import { projectManifestFileName, validateProjectManifest } from '../projects/manifest.mjs'
import { workspaceRoots } from '../workspace/discovery.mjs'
import { createDependencyGraph, findGraphIssues, topologicalProjectOrder } from '../graph/dependency-graph.mjs'
import { pathExists, readJsonFile, walkFiles } from '../utilities/fs.mjs'
import { listTasks } from '../execution/tasks.mjs'

export const checkWorkspaceStructure = async (workspace) => {
    const missingRoots = workspace.roots
        .filter((root) => !root.exists)
        .map((root) => ({ level: 'error', message: `Missing required root directory: ${root.name}` }))

    const requiredFiles = Array.isArray(workspace.architecture.foundation?.requiredFiles) ? workspace.architecture.foundation.requiredFiles : []
    const rootFileStatuses = await Promise.all(
        requiredFiles.map(async (fileName) => ({
            fileName,
            exists: await pathExists(path.join(workspace.root, fileName))
        }))
    )

    const missingRootFiles = rootFileStatuses
        .filter((file) => !file.exists)
        .map((file) => ({ level: 'error', message: `Missing required root file: ${file.fileName}` }))

    return [...missingRoots, ...missingRootFiles]
}

export const checkProjectManifests = (workspace) => workspace.projects.flatMap((project) => validateProjectManifest(project))

export const checkMissingProjectManifests = async (workspace) => {
    const ignoredDirectories = new Set(workspace.architecture.foundation?.ignoredDirectories ?? [])
    const knownRoots = workspace.projects.map((project) => path.resolve(workspace.root, project.root))
    const projectRootNames = Object.keys(workspace.architecture.foundation?.projectRoots ?? {})
    const files = (
        await Promise.all(projectRootNames.map((rootName) => walkFiles(path.join(workspace.root, rootName), { ignoredDirectories })))
    ).flat()
    return files
        .filter((file) => path.basename(file) === 'package.json')
        .filter(
            (file) =>
                !knownRoots.some((root) => {
                    const relative = path.relative(root, file)
                    return relative === 'package.json' || (!relative.startsWith('..') && !path.isAbsolute(relative))
                })
        )
        .map((file) => ({
            level: 'error',
            message: `Workspace unit package ${path.relative(workspace.root, file).split(path.sep).join('/')} has no ${projectManifestFileName}.`
        }))
}

export const checkProjectRegistry = (workspace) => {
    const issues = []
    const projectsByName = new Map()
    const expectedTypes = workspace.architecture.foundation?.projectRoots ?? {}
    const allowedTypesByRoot = workspace.architecture.foundation?.allowedProjectTypesByRoot ?? {}

    for (const project of workspace.projects) {
        const existing = projectsByName.get(project.name)
        if (existing) {
            issues.push({ level: 'error', message: `Duplicate project name ${project.name}: ${existing.root} and ${project.root}.` })
        } else {
            projectsByName.set(project.name, project)
        }
        const rootName = project.root.split('/')[0]
        if (project.root.startsWith('../') || path.isAbsolute(project.root)) {
            issues.push({ level: 'error', message: `${project.name} has invalid workspace path ${project.root}.` })
        }
        const allowedTypes = allowedTypesByRoot[rootName] ?? [expectedTypes[rootName]].filter(Boolean)
        if (!allowedTypes.includes(project.type)) {
            issues.push({
                level: 'error',
                message: `${project.name} is type ${project.type} but its root ${rootName}/ allows ${allowedTypes.join(', ') || 'no project type'}.`
            })
        }
        if (project.internalDependencies.includes(project.name)) {
            issues.push({ level: 'error', message: `${project.name} cannot depend on itself.` })
        }
        for (const field of ['internalDependencies', 'externalDependencies', 'capabilities']) {
            const values = project[field]
            if (new Set(values).size !== values.length) {
                issues.push({ level: 'error', message: `${project.name} contains duplicate values in ${field}.` })
            }
        }
    }
    const taskIds = listTasks(workspace.projects).map((task) => task.id)
    for (const duplicate of taskIds.filter((id, index) => taskIds.indexOf(id) !== index)) {
        issues.push({ level: 'error', message: `Duplicate task id ${duplicate}.` })
    }
    return issues
}

export const checkDependencyGraph = (workspace) => {
    const graph = createDependencyGraph(workspace.projects)
    const graphIssues = findGraphIssues(graph)
    const order = topologicalProjectOrder(graph)
    const cycleIssues = order.cycles.map((name) => ({
        level: 'error',
        message: `Project dependency cycle includes ${name}.`
    }))

    return [...graphIssues, ...cycleIssues]
}

export const checkReservedControlPlaneDependencies = async (workspace) => {
    const disallowed = new Set(workspace.architecture.foundation?.disallowedOrchestrators ?? [])
    const packageJsonPath = path.join(workspace.root, 'package.json')

    if (!(await pathExists(packageJsonPath))) {
        return []
    }

    const packageJson = await readJsonFile(packageJsonPath)
    const dependencyNames = [...Object.keys(packageJson.dependencies ?? {}), ...Object.keys(packageJson.devDependencies ?? {})]

    return dependencyNames
        .filter((name) => disallowed.has(name))
        .map((name) => ({
            level: 'error',
            message: `Disallowed monorepo orchestration dependency found in root package.json: ${name}`
        }))
}

export const requiredProjectManifestPath = (project) => `${project.root}/${projectManifestFileName}`
