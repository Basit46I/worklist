import test from 'node:test'
import assert from 'node:assert/strict'
import { readArchitecture, validateArchitectureConfiguration } from './architecture.mjs'
import { validateArchitectureUiAndPackages } from './architecture-validation-ui.mjs'

test('validates architecture policy structure and workspace unit types', () => {
    const issues = validateArchitectureConfiguration({
        version: 0,
        foundation: { projectRoots: { '../outside': 'service' }, requiredRoots: 'apps' }
    })
    assert.ok(issues.some((issue) => issue.message.includes('positive integer version')))
    assert.ok(issues.some((issue) => issue.message.includes('Invalid workspace unit root')))
    assert.ok(issues.some((issue) => issue.message.includes('invalid type')))
    assert.ok(issues.some((issue) => issue.message.includes('requiredRoots must be an array')))
    assert.ok(issues.some((issue) => issue.message.includes('missing boundary')))
})

test('requires pinned managed TruffleHog filesystem policy', async () => {
    const architecture = await readArchitecture(process.cwd())
    const invalid = structuredClone(architecture)
    invalid.security.secretScan = {
        engine: 'trufflehog',
        version: '',
        execution: 'host-path',
        scanMode: 'git',
        resultClasses: ['verified'],
        configuration: '.trufflehog-exclude-paths.txt'
    }
    const issues = validateArchitectureConfiguration(invalid)
    assert.ok(issues.some((issue) => issue.message.includes('managed TruffleHog filesystem')))
})

test('requires the repository Git governance contract', async () => {
    const architecture = await readArchitecture(process.cwd())
    const invalid = structuredClone(architecture)
    invalid.gitGovernance.hooks = 'custom-hooks'
    const issues = validateArchitectureConfiguration(invalid)
    assert.ok(issues.some((issue) => issue.message.includes('Git governance')))
})

test('architecture UI and package validator reports malformed composition, registry, and package policy', () => {
    const issues = []
    validateArchitectureUiAndPackages({
        uiComposition: {
            genericRoots: 'bad', genericFiles: null, applicationRoots: 1, appForbiddenGenericRoots: {}, shadcnPrimitiveNames: null,
            registryCatalogItems: ['dropdown'], registryUnavailableItems: undefined, packageProject: 7, registryFirst: false,
            registryConfig: 4, registryCliPackage: null, registryCliVersion: {}, registryAddScript: [], registryAddAllScript: false,
            registryAliases: []
        },
        integrations: { externalImplementationPackages: false },
        maintenanceScripts: { packageLocal: [], contract: {} },
        moduleBoundaries: [{}],
        packageManagement: { manager: 'npm', workspacePatterns: null, forbiddenLockfiles: {}, allowedBuildDependencies: 'bad', packageManagerVersion: 7, workspaceFile: null, lockfile: [], internalDependencyProtocol: 1 }
    }, issues)
    assert.ok(issues.some(({ message }) => message.includes('registry-first')))
    assert.ok(issues.some(({ message }) => message.includes('registryAliases must be an object')))
    assert.ok(issues.some(({ message }) => message.includes('Registry catalog item dropdown')))
    assert.ok(issues.some(({ message }) => message.includes('maintenance-script contract')))
    assert.ok(issues.some(({ message }) => message.includes('module boundary requires')))
    assert.ok(issues.some(({ message }) => message.includes('package manager must be pnpm')))
})

test('architecture UI and package validator reports missing policy sections and accepts valid registry contracts', () => {
    const missing = []
    validateArchitectureUiAndPackages({ uiComposition: null, integrations: null, maintenanceScripts: null, moduleBoundaries: null, packageManagement: null }, missing)
    assert.equal(missing.length, 5)

    const valid = []
    validateArchitectureUiAndPackages({
        uiComposition: {
            genericRoots: [], genericFiles: [], applicationRoots: [], appForbiddenGenericRoots: [], shadcnPrimitiveNames: ['button'],
            registryCatalogItems: ['button'], registryUnavailableItems: [], packageProject: 'ui', registryFirst: true,
            registryConfig: 'components.json', registryCliPackage: 'shadcn', registryCliVersion: '4.20.0', registryAddScript: 'ui:add',
            registryAddAllScript: 'ui:add:all', registryAliases: { components: '@/components' }
        },
        integrations: { externalImplementationPackages: [] },
        maintenanceScripts: { packageLocal: [], contract: { ownPackageOnly: true, deterministic: true, idempotent: true, mayOrchestrateRepository: false, mayChangeArchitecture: false, mayBypassPolicy: false } },
        moduleBoundaries: [],
        packageManagement: { manager: 'pnpm', workspacePatterns: [], forbiddenLockfiles: [], allowedBuildDependencies: [], packageManagerVersion: '11.19.0', workspaceFile: 'pnpm-workspace.yaml', lockfile: 'pnpm-lock.yaml', internalDependencyProtocol: 'workspace:*' }
    }, valid)
    assert.deepEqual(valid, [])
})
