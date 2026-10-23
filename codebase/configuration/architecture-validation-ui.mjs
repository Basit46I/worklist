export const validateArchitectureUiAndPackages = (architecture, issues) => {
    if (!architecture.uiComposition || typeof architecture.uiComposition !== 'object') {
        issues.push({ level: 'error', message: 'Architecture policy is missing UI composition rules.' })
    } else {
        for (const field of [
            'genericRoots',
            'genericFiles',
            'applicationRoots',
            'appForbiddenGenericRoots',
            'shadcnPrimitiveNames',
            'registryCatalogItems',
            'registryUnavailableItems'
        ]) {
            if (!Array.isArray(architecture.uiComposition[field])) {
                issues.push({ level: 'error', message: `Architecture uiComposition.${field} must be an array.` })
            }
        }
        if (typeof architecture.uiComposition.packageProject !== 'string') {
            issues.push({ level: 'error', message: 'Architecture uiComposition.packageProject must identify the generic UI package.' })
        }
        if (architecture.uiComposition.registryFirst !== true) {
            issues.push({ level: 'error', message: 'Architecture UI composition must require registry-first component creation.' })
        }
        for (const field of ['registryConfig', 'registryCliPackage', 'registryCliVersion', 'registryAddScript', 'registryAddAllScript']) {
            if (typeof architecture.uiComposition[field] !== 'string') {
                issues.push({ level: 'error', message: `Architecture uiComposition.${field} must be a string.` })
            }
        }
        if (
            !architecture.uiComposition.registryAliases ||
            typeof architecture.uiComposition.registryAliases !== 'object' ||
            Array.isArray(architecture.uiComposition.registryAliases)
        ) {
            issues.push({ level: 'error', message: 'Architecture uiComposition.registryAliases must be an object.' })
        }
        const primitiveNames = new Set(architecture.uiComposition.shadcnPrimitiveNames ?? [])
        for (const item of architecture.uiComposition.registryCatalogItems ?? []) {
            if (!primitiveNames.has(item)) {
                issues.push({ level: 'error', message: `Registry catalog item ${item} must be protected as a shadcn primitive name.` })
            }
        }
    }
    if (!architecture.integrations || typeof architecture.integrations !== 'object') {
        issues.push({ level: 'error', message: 'Architecture policy is missing integration-boundary rules.' })
    } else if (!Array.isArray(architecture.integrations.externalImplementationPackages)) {
        issues.push({ level: 'error', message: 'Architecture integrations.externalImplementationPackages must be an array.' })
    }
    const maintenanceScripts = architecture.maintenanceScripts
    if (
        !maintenanceScripts ||
        !Array.isArray(maintenanceScripts.packageLocal) ||
        maintenanceScripts.contract?.ownPackageOnly !== true ||
        maintenanceScripts.contract?.deterministic !== true ||
        maintenanceScripts.contract?.idempotent !== true ||
        maintenanceScripts.contract?.mayOrchestrateRepository !== false ||
        maintenanceScripts.contract?.mayChangeArchitecture !== false ||
        maintenanceScripts.contract?.mayBypassPolicy !== false
    ) {
        issues.push({ level: 'error', message: 'Architecture policy must define the package-local maintenance-script contract.' })
    }
    if (!Array.isArray(architecture.moduleBoundaries)) {
        issues.push({ level: 'error', message: 'Architecture policy requires a moduleBoundaries array.' })
    } else {
        for (const boundary of architecture.moduleBoundaries) {
            if (
                typeof boundary?.project !== 'string' ||
                typeof boundary?.root !== 'string' ||
                !Array.isArray(boundary?.categories) ||
                !Array.isArray(boundary?.rootExports)
            ) {
                issues.push({ level: 'error', message: 'Each module boundary requires project, root, categories, and rootExports fields.' })
            }
        }
    }
    const packageManagement = architecture.packageManagement
    if (!packageManagement || typeof packageManagement !== 'object') {
        issues.push({ level: 'error', message: 'Architecture policy is missing package-management rules.' })
    } else {
        if (packageManagement.manager !== 'pnpm') {
            issues.push({ level: 'error', message: 'Architecture package manager must be pnpm.' })
        }
        for (const field of ['workspacePatterns', 'forbiddenLockfiles', 'allowedBuildDependencies']) {
            if (!Array.isArray(packageManagement[field])) {
                issues.push({ level: 'error', message: `Architecture packageManagement.${field} must be an array.` })
            }
        }
        for (const field of ['packageManagerVersion', 'workspaceFile', 'lockfile', 'internalDependencyProtocol']) {
            if (typeof packageManagement[field] !== 'string') {
                issues.push({ level: 'error', message: `Architecture packageManagement.${field} must be a string.` })
            }
        }
    }
    const security = architecture.security
}
