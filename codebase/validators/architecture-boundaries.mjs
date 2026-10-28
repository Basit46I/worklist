import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { pathExists, toPosixPath } from '../utilities/fs.mjs'
import { fileRole, featureIdentity, getImports, includesSegment, issue, localIssue, resolveWorkspaceImport, segmentsOf, startsWithPath, uiLayer } from './architecture-boundaries.shared.mjs'
import { prepareArchitectureBoundaryScan } from './architecture-boundaries.structure.mjs'

export const validateArchitectureBoundaries = async (workspace) => {
    const policy = workspace.architecture.boundaries ?? {}
    const uiPolicy = workspace.architecture.uiComposition ?? {}
    const integrationPolicy = workspace.architecture.integrations ?? {}
    const dependencyDirection = {
        app: ['servers', 'prebuilt'],
        server: ['apps', 'prebuilt'],
        package: policy.packagesCannotImport ?? ['apps', 'servers', 'prebuilt'],
        ...(policy.workspaceUnitCannotImport ?? {})
    }
    const { findings, moduleBoundaries, packageModuleSpecifiers, projectFiles } = await prepareArchitectureBoundaryScan(workspace)
    for (const { project, filePath } of projectFiles.flat()) {
        const source = await readFile(filePath, 'utf8')
        const sourceSegments = segmentsOf(path.relative(workspace.root, filePath))
        const projectRelativePath = toPosixPath(path.relative(path.resolve(workspace.root, project.root), filePath))
        const sourceFeature = featureIdentity(sourceSegments)
        const usesUiPackageModel = typeof uiPolicy.packageProject === 'string'
        const isUiPackage = project.name === uiPolicy.packageProject
        const sourceUiLayer =
            isUiPackage || (!usesUiPackageModel && project.type === 'app')
                ? uiLayer(projectRelativePath, uiPolicy)
                : project.type === 'app' && (uiPolicy.applicationRoots ?? []).some((root) => startsWithPath(projectRelativePath, root))
                  ? 'application'
                  : project.type === 'app' && startsWithPath(projectRelativePath, uiPolicy.featureRoot ?? 'features')
                    ? 'feature'
                    : undefined

        if ((isUiPackage || project.type === 'app') && projectRelativePath.includes('/')) {
            const componentName = path.basename(filePath, path.extname(filePath))
            const isPrimitive = isUiPackage && startsWithPath(projectRelativePath, uiPolicy.primitiveRoot ?? 'components/ui')
            const isLegacyPrimitive =
                !usesUiPackageModel && project.type === 'app' && startsWithPath(projectRelativePath, uiPolicy.primitiveRoot ?? 'components/ui')
            if (!isPrimitive && !isLegacyPrimitive && (uiPolicy.shadcnPrimitiveNames ?? []).includes(componentName)) {
                findings.push(
                    localIssue(
                        workspace.root,
                        filePath,
                        'shadcn-primitive-ownership',
                        `${componentName} duplicates a named shadcn primitive outside ${uiPolicy.primitiveRoot ?? 'components/ui'}.`
                    )
                )
            }
        }

        if (
            usesUiPackageModel &&
            project.type === 'app' &&
            (uiPolicy.appForbiddenGenericRoots ?? []).some((root) => startsWithPath(projectRelativePath, root))
        ) {
            findings.push(
                localIssue(
                    workspace.root,
                    filePath,
                    'generic-ui-ownership',
                    `generic UI belongs in the ${uiPolicy.packageProject} package, not an application-local generic UI root.`
                )
            )
        }

        if (isUiPackage && sourceSegments.includes('features')) {
            findings.push(
                localIssue(workspace.root, filePath, 'feature-ui-ownership', 'feature-specific UI must remain in its owning application feature.')
            )
        }

        if (project.type === 'server' && includesSegment(sourceSegments, policy.serverDisallowedSegments ?? [])) {
            findings.push(
                localIssue(
                    workspace.root,
                    filePath,
                    'server-operational-observability',
                    'server-local observability is prohibited; use packages/logging for implementation and enablers/observability for operational ownership.'
                )
            )
        }

        for (const specifier of getImports(source)) {
            for (const [packageName, exportKeys] of packageModuleSpecifiers) {
                if (specifier.startsWith(`${packageName}/`)) {
                    const subpath = `./${specifier.slice(packageName.length + 1)}`
                    const isExported = exportKeys.some((key) => key === subpath || (key.endsWith('/*') && subpath.startsWith(key.slice(0, -1))))
                    if (!isExported) {
                        findings.push(
                            issue(
                                workspace.root,
                                filePath,
                                specifier,
                                'module-public-import',
                                `consumers must use an exported ${packageName} public surface.`
                            )
                        )
                    }
                }
            }
            const targetPath = resolveWorkspaceImport({
                workspaceRoot: workspace.root,
                projectRoot: project.root,
                sourceFile: filePath,
                specifier
            })
            const targetSegments = targetPath ? segmentsOf(path.relative(workspace.root, targetPath)) : []
            const targetFileRole = targetPath ? fileRole(targetPath) : undefined

            if (project.type === 'server') {
                const externalRoot = specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0]
                const isIntegrationFile = sourceSegments.includes(integrationPolicy.serverDirectory ?? 'integrations')
                if ((integrationPolicy.externalImplementationPackages ?? []).includes(externalRoot) && !isIntegrationFile) {
                    findings.push(
                        issue(
                            workspace.root,
                            filePath,
                            specifier,
                            'external-integration-boundary',
                            `server code must access ${externalRoot} through an integrations/ boundary or reusable package.`
                        )
                    )
                }
            }

            if (targetPath) {
                const normalizedTarget = toPosixPath(path.relative(path.resolve(workspace.root, project.root), targetPath))
                    .replace(/\.[^/.]+$/, '')
                    .replace(/\/index$/, '')
                for (const boundary of moduleBoundaries.filter(({ project: owner }) => owner.name === project.name)) {
                    for (const category of boundary.categories) {
                        const categoryRoot = `${boundary.root}/${category}`
                        const sourcePath = projectRelativePath.replace(/\.[^/.]+$/, '')
                        const importsCategoryInternal = normalizedTarget.startsWith(`${categoryRoot}/`)
                        const sourceOwnsCategory = sourcePath.startsWith(`${categoryRoot}/`)
                        if (importsCategoryInternal && !sourceOwnsCategory) {
                            findings.push(
                                issue(
                                    workspace.root,
                                    filePath,
                                    specifier,
                                    'module-public-import',
                                    `consumers outside ${categoryRoot} must import its public index.`
                                )
                            )
                        }
                    }
                }
            }

            if (sourceUiLayer && targetPath) {
                const targetProjectRelativePath = toPosixPath(path.relative(path.resolve(workspace.root, project.root), targetPath))
                const targetUiLayer = uiLayer(targetProjectRelativePath, uiPolicy)
                const reversesPrimitive = sourceUiLayer === 'primitive' && ['generic', 'feature', 'application'].includes(targetUiLayer)
                const reversesGeneric = sourceUiLayer === 'generic' && ['feature', 'application'].includes(targetUiLayer)
                if (reversesPrimitive || reversesGeneric) {
                    findings.push(
                        issue(
                            workspace.root,
                            filePath,
                            specifier,
                            'ui-composition-direction',
                            `${sourceUiLayer} UI cannot depend on ${targetUiLayer} UI.`
                        )
                    )
                }
            }

            const forbiddenRoots = dependencyDirection[project.type] ?? []
            if (targetSegments.length > 0 && forbiddenRoots.includes(targetSegments[0])) {
                const rule = project.type === 'package' ? 'packages-dependency-direction' : `${project.type}-dependency-direction`
                findings.push(
                    issue(
                        workspace.root,
                        filePath,
                        specifier,
                        rule,
                        `${project.type} workspace units cannot import ${targetSegments[0]} workspace units.`
                    )
                )
            }

            if (sourceSegments.includes('domain')) {
                const externalRoot = specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0]
                const importsForbiddenRole = (policy.domainCannotImportFileRoles ?? []).includes(targetFileRole)
                if (
                    (policy.domainCannotImportPackages ?? []).includes(externalRoot) ||
                    includesSegment(targetSegments, policy.domainCannotImportSegments ?? []) ||
                    importsForbiddenRole
                ) {
                    findings.push(
                        issue(
                            workspace.root,
                            filePath,
                            specifier,
                            'domain-isolation',
                            'domain code cannot depend on protocol, persistence-model, or infrastructure implementation details.'
                        )
                    )
                }
            }

            if (
                includesSegment(sourceSegments, policy.uiSegments ?? []) &&
                (includesSegment(targetSegments, policy.persistenceSegments ?? []) || (policy.persistenceFileRoles ?? []).includes(targetFileRole))
            ) {
                findings.push(
                    issue(
                        workspace.root,
                        filePath,
                        specifier,
                        'ui-persistence-boundary',
                        'UI code cannot import persistence implementation directly.'
                    )
                )
            }

            const sourceIsService = sourceSegments.includes('services') || fileRole(filePath) === 'service'
            const serviceImportsForbiddenRole = (policy.serviceCannotImportFileRoles ?? []).includes(targetFileRole)
            if (
                sourceIsService &&
                (includesSegment(targetSegments, policy.serviceCannotImportSegments ?? ['routes', 'controllers', 'ui', 'components']) ||
                    serviceImportsForbiddenRole)
            ) {
                findings.push(issue(workspace.root, filePath, specifier, 'service-isolation', 'service code cannot depend on delivery or UI layers.'))
            }

            const targetFeature = featureIdentity(targetSegments)
            if (!sourceFeature && targetFeature && project.type === 'server') {
                const targetRemainder = targetSegments.slice(targetFeature.index + 2)
                const targetsFeaturePublicApi = targetRemainder.length === 1 && /^index(?:\.[^.]+)?$/.test(targetRemainder[0])
                if (!targetsFeaturePublicApi) {
                    findings.push(
                        issue(
                            workspace.root,
                            filePath,
                            specifier,
                            'feature-public-import',
                            `server consumers outside feature ${targetFeature.name} must import its root public API.`
                        )
                    )
                }
            }
            if (sourceFeature && targetFeature && sourceFeature.name !== targetFeature.name) {
                const targetRemainder = targetSegments.slice(targetFeature.index + 2)
                const targetsPublicModule = targetRemainder.length === 1 && /^public(?:\.[^.]+)?$/.test(targetRemainder[0])
                if (!targetsPublicModule) {
                    findings.push(
                        issue(
                            workspace.root,
                            filePath,
                            specifier,
                            'feature-private-import',
                            `feature ${sourceFeature.name} cannot import private internals of feature ${targetFeature.name}; expose an explicit public module.`
                        )
                    )
                }
            }
        }
    }

    return findings
}
