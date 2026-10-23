import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { pathExists, readJsonFile, walkFiles } from '../utilities/fs.mjs'

export const checkServerFeatureArchitecture = async (workspace) => {
    const policy = workspace.architecture.featureModel ?? {}
    const featureRoot = policy.serverFeatureRoot ?? 'features'
    const registrationFile = policy.serverFeatureRegistrationFile ?? 'bootstrap/create-app.ts'
    const routeSuffix = policy.serverRouteFileSuffix ?? '.route.ts'
    const ignoredDirectories = new Set(workspace.architecture.foundation?.ignoredDirectories ?? [])
    const issues = []

    for (const project of workspace.projects.filter((candidate) => candidate.type === 'server')) {
        const projectRoot = path.join(workspace.root, project.root)
        const files = await walkFiles(projectRoot, { ignoredDirectories })
        const routeFiles = files.filter((file) => file.endsWith(routeSuffix))
        const registrationPath = path.join(projectRoot, registrationFile)
        const registrationSource = (await pathExists(registrationPath)) ? await readFile(registrationPath, 'utf8') : ''

        if (!registrationSource) {
            issues.push({ level: 'error', message: `${project.name} is missing its server feature registration file ${registrationFile}.` })
        } else if (/\bapp\.(?:get|post|put|patch|delete|options|head)\s*\(/.test(registrationSource)) {
            issues.push({
                level: 'error',
                message: `${project.name} registers an HTTP route inline in ${registrationFile}; routes belong to feature routers.`
            })
        }

        for (const routeFile of routeFiles) {
            const relative = path.relative(projectRoot, routeFile).split(path.sep).join('/')
            const segments = relative.split('/')
            if (segments.length !== 4 || segments[0] !== featureRoot || segments[2] !== 'routes') {
                issues.push({
                    level: 'error',
                    message: `${project.name} route ${relative} must live at ${featureRoot}/<feature>/routes/<name>${routeSuffix}.`
                })
                continue
            }

            const featureName = segments[1]
            const source = await readFile(routeFile, 'utf8')
            const factoryName = source.match(/export\s+const\s+(create[A-Z][A-Za-z0-9]*Routes)\s*=/)?.[1]
            if (!factoryName) {
                issues.push({ level: 'error', message: `${project.name} route ${relative} must export a deterministic create*Routes factory.` })
                continue
            }
            if (/\b(?:response|res)\.(?:json|send|status)\s*\(/.test(source)) {
                issues.push({
                    level: 'error',
                    message: `${project.name} route ${relative} contains HTTP response logic; delegate response orchestration to a controller.`
                })
            }

            const routeIndexPath = path.join(projectRoot, featureRoot, featureName, 'routes', 'index.ts')
            const routeIndexSource = (await pathExists(routeIndexPath)) ? await readFile(routeIndexPath, 'utf8') : ''
            if (!routeIndexSource.includes(factoryName)) {
                issues.push({
                    level: 'error',
                    message: `${project.name} feature ${featureName} routes must expose ${factoryName} from routes/index.ts.`
                })
            }
            const indexPath = path.join(projectRoot, featureRoot, featureName, 'index.ts')
            const indexSource = (await pathExists(indexPath)) ? await readFile(indexPath, 'utf8') : ''
            if (!indexSource.includes(factoryName)) {
                issues.push({ level: 'error', message: `${project.name} feature ${featureName} must expose ${factoryName} from its index.ts.` })
            }
            const publicImport = `../${featureRoot}/${featureName}/index.js`
            if (!registrationSource.includes(publicImport) || !registrationSource.includes(`${factoryName}(`)) {
                issues.push({
                    level: 'error',
                    message: `${project.name} feature ${featureName} must be explicitly registered through ${publicImport}.`
                })
            }
        }
    }

    return issues
}

export const checkPackageLocalMaintenanceScripts = async (workspace) => {
    const policies = workspace.architecture.maintenanceScripts?.packageLocal ?? []
    const issues = []
    const forbiddenBehavior =
        /(?:apps|servers|prebuilt|codebase|enablers|\.agent|\.project)[\\/]|architecture\.yaml|\.\.\s*[\\/]\s*\.\.|node:child_process|\b(?:fetch|process\.cwd|Math\.random|Date\.now)\b/

    for (const policy of policies) {
        const project = workspace.projects.find((candidate) => candidate.name === policy.project)
        if (!project) {
            issues.push({ level: 'error', message: `Maintenance script project ${policy.project} is not registered.` })
            continue
        }
        const projectRoot = path.resolve(workspace.root, project.root)
        const scriptPath = path.resolve(projectRoot, policy.path)
        const relative = path.relative(projectRoot, scriptPath)
        if (relative.startsWith('..') || path.isAbsolute(relative) || !(await pathExists(scriptPath))) {
            issues.push({ level: 'error', message: `${project.name} maintenance script must exist inside its owning package: ${policy.path}.` })
            continue
        }
        const source = await readFile(scriptPath, 'utf8')
        if (!source.includes('packageRoot') || forbiddenBehavior.test(source)) {
            issues.push({ level: 'error', message: `${project.name} maintenance script ${policy.path} violates package-local deterministic scope.` })
        }
        const packageJson = await readJsonFile(path.join(projectRoot, 'package.json'))
        if (!packageJson.scripts?.[policy.packageScript]?.includes(policy.path)) {
            issues.push({ level: 'error', message: `${project.name} package script ${policy.packageScript} must invoke ${policy.path}.` })
        }
    }

    return issues
}

