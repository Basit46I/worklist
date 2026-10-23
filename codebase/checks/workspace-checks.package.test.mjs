import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { checkMissingProjectManifests, checkPackageManagerArchitecture, checkPackageLocalMaintenanceScripts, checkProjectRegistry, checkUiRegistryWorkflow } from './workspace-checks.mjs'

test('allows config projects only in architecture-approved roots', () => {
    const architecture = {
        foundation: {
            projectRoots: { apps: 'app', packages: 'package' },
            allowedProjectTypesByRoot: { apps: ['app'], packages: ['package', 'config'] }
        }
    }
    const validIssues = checkProjectRegistry({
        architecture,
        projects: [
            {
                name: 'tsconfig',
                type: 'config',
                root: 'packages/tsconfig',
                internalDependencies: [],
                externalDependencies: [],
                capabilities: [],
                tasks: []
            }
        ]
    })
    const invalidIssues = checkProjectRegistry({
        architecture,
        projects: [
            {
                name: 'tsconfig',
                type: 'config',
                root: 'apps/tsconfig',
                internalDependencies: [],
                externalDependencies: [],
                capabilities: [],
                tasks: []
            }
        ]
    })

    assert.deepEqual(validIssues, [])
    assert.ok(invalidIssues.some((issue) => issue.message.includes('allows app')))
})

test('rejects stale npm workspace metadata and non-workspace internal dependencies', async (context) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'repo-package-manager-'))
    context.after(() => rm(root, { recursive: true, force: true }))
    await mkdir(path.join(root, 'apps', 'web'), { recursive: true })
    await mkdir(path.join(root, 'packages', 'ui'), { recursive: true })
    await writeFile(
        path.join(root, 'package.json'),
        JSON.stringify({
            packageManager: 'pnpm@11.19.0',
            workspaces: ['apps/*'],
            scripts: { test: 'npm test' }
        }),
        'utf8'
    )
    await writeFile(path.join(root, 'pnpm-workspace.yaml'), 'packages:\n  - "apps/*"\n  - "packages/*"\nallowBuilds:\n  esbuild: true\n', 'utf8')
    await writeFile(path.join(root, 'pnpm-lock.yaml'), "lockfileVersion: '9.0'\n", 'utf8')
    await writeFile(
        path.join(root, 'apps', 'web', 'package.json'),
        JSON.stringify({
            name: '@workspace/web',
            dependencies: { '@workspace/ui': '0.1.0' }
        }),
        'utf8'
    )
    await writeFile(path.join(root, 'packages', 'ui', 'package.json'), JSON.stringify({ name: '@workspace/ui' }), 'utf8')

    const issues = await checkPackageManagerArchitecture({
        root,
        architecture: {
            packageManagement: {
                manager: 'pnpm',
                packageManagerVersion: '11.19.0',
                workspaceFile: 'pnpm-workspace.yaml',
                workspacePatterns: ['apps/*', 'packages/*'],
                allowedBuildDependencies: ['esbuild', 'unrs-resolver'],
                lockfile: 'pnpm-lock.yaml',
                forbiddenLockfiles: ['package-lock.json'],
                internalDependencyProtocol: 'workspace:'
            }
        },
        projects: [
            { name: 'web', root: 'apps/web', internalDependencies: ['ui'], tasks: [{ name: 'test', command: 'npm test' }] },
            { name: 'ui', root: 'packages/ui', internalDependencies: [], tasks: [] }
        ]
    })

    assert.ok(issues.some((issue) => issue.message.includes('stale npm workspaces')))
    assert.ok(issues.some((issue) => issue.message.includes('stale npm command')))
    assert.ok(issues.some((issue) => issue.message.includes('must execute through pnpm')))
    assert.ok(issues.some((issue) => issue.message.includes('workspace:')))
    assert.ok(issues.some((issue) => issue.message.includes('allowBuilds')))
})

test('reports package-defined workspace units without a project manifest', async (context) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'repo-missing-manifest-'))
    context.after(() => rm(root, { recursive: true, force: true }))
    await mkdir(path.join(root, 'apps', 'web'), { recursive: true })
    await writeFile(path.join(root, 'apps', 'web', 'package.json'), '{}', 'utf8')
    const issues = await checkMissingProjectManifests({
        root,
        architecture: { foundation: { projectRoots: { apps: 'app' }, ignoredDirectories: [] } },
        projects: []
    })
    assert.equal(issues.length, 1)
    assert.match(issues[0].message, /apps\/web\/package.json has no project.json/)
})

test('rejects package maintenance scripts that reach outside their owner', async (context) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'repo-maintenance-script-'))
    context.after(() => rm(root, { recursive: true, force: true }))
    const packageRoot = path.join(root, 'packages', 'ui')
    await mkdir(path.join(packageRoot, 'scripts'), { recursive: true })
    await writeFile(
        path.join(packageRoot, 'scripts', 'reconcile.mjs'),
        "const packageRoot = '..';\nawait writeFile('../../architecture.yaml', 'x');\n",
        'utf8'
    )
    await writeFile(path.join(packageRoot, 'package.json'), JSON.stringify({ scripts: { reconcile: 'node scripts/reconcile.mjs' } }), 'utf8')

    const issues = await checkPackageLocalMaintenanceScripts({
        root,
        architecture: { maintenanceScripts: { packageLocal: [{ project: 'ui', path: 'scripts/reconcile.mjs', packageScript: 'reconcile' }] } },
        projects: [{ name: 'ui', root: 'packages/ui' }]
    })

    assert.equal(issues.length, 1)
    assert.match(issues[0].message, /violates package-local deterministic scope/)
})

test('requires the pinned official shadcn registry workflow', async (context) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'repo-ui-registry-'))
    context.after(() => rm(root, { recursive: true, force: true }))
    const projectRoot = path.join(root, 'packages', 'ui')
    await mkdir(projectRoot, { recursive: true })
    await writeFile(path.join(root, 'package.json'), JSON.stringify({ scripts: {} }), 'utf8')
    await writeFile(
        path.join(projectRoot, 'package.json'),
        JSON.stringify({
            scripts: { 'ui:add': 'custom-generator add' },
            devDependencies: { shadcn: '^4.20.0' }
        }),
        'utf8'
    )

    const issues = await checkUiRegistryWorkflow({
        root,
        architecture: {
            uiComposition: {
                packageProject: 'ui',
                registryConfig: 'components.json',
                registryCliPackage: 'shadcn',
                registryCliVersion: '4.20.0',
                registryAddScript: 'ui:add',
                registryAddAllScript: 'ui:add:all'
            }
        },
        projects: [{ name: 'ui', root: 'packages/ui' }]
    })

    assert.equal(issues.length, 6)
    assert.ok(issues.some((issue) => issue.message.includes('registry configuration')))
    assert.ok(issues.some((issue) => issue.message.includes('must pin shadcn')))
    assert.ok(issues.some((issue) => issue.message.includes('official shadcn add workflow')))
})

