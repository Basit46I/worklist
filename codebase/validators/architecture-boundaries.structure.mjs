import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { pathExists, toPosixPath, walkFiles } from '../utilities/fs.mjs'
import { localIssue, sourceExtensions } from './architecture-boundaries.shared.mjs'

export const prepareArchitectureBoundaryScan = async (workspace) => {
    const uiPolicy = workspace.architecture.uiComposition ?? {}
    const ignoredDirectories = new Set(workspace.architecture.foundation?.ignoredDirectories ?? [])
    const projectFiles = await Promise.all(
        workspace.projects.map(async (project) => {
            const root = path.resolve(workspace.root, project.root)
            const files = await walkFiles(root, { ignoredDirectories })
            return files.filter((filePath) => sourceExtensions.has(path.extname(filePath))).map((filePath) => ({ project, filePath }))
        })
    )
    const findings = []
    const moduleBoundaries = (workspace.architecture.moduleBoundaries ?? []).flatMap((boundary) => {
        const project = workspace.projects.find(({ name }) => name === boundary.project)
        return project ? [{ ...boundary, project }] : []
    })
    const packageModuleSpecifiers = new Map()

    if (typeof uiPolicy.packageProject === 'string' && !workspace.projects.some(({ name }) => name === uiPolicy.packageProject)) {
        findings.push({
            level: 'error',
            rule: 'generic-ui-ownership',
            file: 'architecture.yaml',
            message: `Configured generic UI package ${uiPolicy.packageProject} is not a discovered workspace project.`
        })
    }

    for (const boundary of moduleBoundaries.filter(({ project }) => project.type === 'package')) {
        const packageJsonPath = path.resolve(workspace.root, boundary.project.root, 'package.json')
        if (await pathExists(packageJsonPath)) {
            const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'))
            if (typeof packageJson.name === 'string') {
                packageModuleSpecifiers.set(packageJson.name, Object.keys(packageJson.exports ?? { '.': true }))
            }
        }
    }

    for (const boundary of moduleBoundaries) {
        const moduleRoot = path.resolve(workspace.root, boundary.project.root, boundary.root)
        const moduleIndex = path.join(moduleRoot, 'index.ts')
        const moduleIndexSource = (await pathExists(moduleIndex)) ? await readFile(moduleIndex, 'utf8') : ''
        if (!(await pathExists(moduleIndex))) {
            findings.push(
                localIssue(workspace.root, moduleRoot, 'module-public-surface', `module ${boundary.root} requires an index.ts public surface.`)
            )
        }
        for (const category of boundary.categories) {
            const categoryRoot = path.join(moduleRoot, category)
            const categoryIndex = path.join(categoryRoot, 'index.ts')
            if (!(await pathExists(categoryIndex))) {
                findings.push(
                    localIssue(
                        workspace.root,
                        categoryRoot,
                        'module-public-surface',
                        `category ${boundary.root}/${category} requires an index.ts public surface.`
                    )
                )
            }
        }
        for (const category of boundary.rootExports ?? []) {
            if (!new RegExp(`["']\\./${category}(?:/index(?:\\.js)?)?["']`).test(moduleIndexSource)) {
                findings.push(
                    localIssue(
                        workspace.root,
                        moduleIndex,
                        'module-public-export',
                        `module ${boundary.root} must re-export the ${category} category public surface.`
                    )
                )
            }
        }
        const moduleFiles = await walkFiles(moduleRoot, { ignoredDirectories })
        for (const file of moduleFiles) {
            const relative = toPosixPath(path.relative(moduleRoot, file))
            if (!relative.includes('/') && sourceExtensions.has(path.extname(file)) && relative !== 'index.ts') {
                findings.push(
                    localIssue(
                        workspace.root,
                        file,
                        'module-dumping-ground',
                        `categorized module ${boundary.root} may only expose source from its root index.ts.`
                    )
                )
            }
        }
    }

    for (const project of workspace.projects) {
        for (const area of ['constants', 'types']) {
            const areaRoot = path.resolve(workspace.root, project.root, area)
            const directSourceFiles = (await walkFiles(areaRoot, { ignoredDirectories })).filter((file) => {
                const relative = toPosixPath(path.relative(areaRoot, file))
                return !relative.includes('/') && relative !== 'index.ts' && sourceExtensions.has(path.extname(file))
            })
            if (directSourceFiles.length > 1) {
                findings.push(
                    localIssue(
                        workspace.root,
                        areaRoot,
                        `${area}-dumping-ground`,
                        `${area}/ contains multiple unrelated root source files; categorize them behind meaningful public modules.`
                    )
                )
            }
        }
    }
    return { findings, moduleBoundaries, packageModuleSpecifiers, projectFiles }
}
