import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { validateArchitectureBoundaries } from './architecture-boundaries.mjs'

test('rejects a package importing application code', async (context) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'repo-boundary-'))
    context.after(() => rm(root, { recursive: true, force: true }))
    const sourceRoot = path.join(root, 'packages', 'ui', 'src')
    await mkdir(sourceRoot, { recursive: true })
    await writeFile(path.join(sourceRoot, 'button.ts'), "import '../../../apps/store/private.js';\n", 'utf8')

    const findings = await validateArchitectureBoundaries({
        root,
        architecture: {
            foundation: { ignoredDirectories: [] },
            boundaries: {
                packagesCannotImport: ['apps', 'servers', 'prebuilt'],
                domainCannotImportSegments: ['controllers', 'routes', 'models'],
                domainCannotImportPackages: ['express', 'mongoose', 'next', 'redis'],
                uiSegments: ['components', 'ui'],
                persistenceSegments: ['models', 'persistence', 'repositories']
            }
        },
        projects: [{ name: 'ui', type: 'package', root: 'packages/ui' }]
    })

    assert.equal(findings.length, 1)
    assert.equal(findings[0].rule, 'packages-dependency-direction')
})

test('rejects a server importing application code', async (context) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'repo-server-boundary-'))
    context.after(() => rm(root, { recursive: true, force: true }))
    const sourceRoot = path.join(root, 'servers', 'api', 'src')
    await mkdir(sourceRoot, { recursive: true })
    await writeFile(path.join(sourceRoot, 'service.ts'), "import '../../../apps/web/private.js';\n", 'utf8')
    const findings = await validateArchitectureBoundaries({
        root,
        architecture: { foundation: { ignoredDirectories: [] }, boundaries: {} },
        projects: [{ name: 'api', type: 'server', root: 'servers/api' }]
    })
    assert.equal(findings[0].rule, 'server-dependency-direction')
})

test('rejects observability implementation owned by a server', async (context) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'repo-server-observability-'))
    context.after(() => rm(root, { recursive: true, force: true }))
    const sourceRoot = path.join(root, 'servers', 'api', 'observability')
    await mkdir(sourceRoot, { recursive: true })
    await writeFile(path.join(sourceRoot, 'logger.ts'), 'export {};\n', 'utf8')

    const findings = await validateArchitectureBoundaries({
        root,
        architecture: {
            foundation: { ignoredDirectories: [] },
            boundaries: { serverDisallowedSegments: ['observability'] }
        },
        projects: [{ name: 'api', type: 'server', root: 'servers/api' }]
    })

    assert.equal(findings.length, 1)
    assert.equal(findings[0].rule, 'server-operational-observability')
})

test('enforces domain isolation for flat feature file roles', async (context) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'repo-flat-domain-'))
    context.after(() => rm(root, { recursive: true, force: true }))
    const featureRoot = path.join(root, 'servers', 'api', 'orders')
    await mkdir(path.join(featureRoot, 'domain'), { recursive: true })
    await writeFile(path.join(featureRoot, 'domain', 'orders.rules.ts'), "import '../orders.model.ts';\n", 'utf8')
    await writeFile(path.join(featureRoot, 'orders.model.ts'), 'export {};\n', 'utf8')
    const findings = await validateArchitectureBoundaries({
        root,
        architecture: {
            foundation: { ignoredDirectories: [] },
            boundaries: { domainCannotImportFileRoles: ['route', 'controller', 'service', 'repository', 'validation', 'model', 'integration'] }
        },
        projects: [{ name: 'api', type: 'server', root: 'servers/api' }]
    })
    assert.equal(findings.length, 1)
    assert.equal(findings[0].rule, 'domain-isolation')
})

test('allows services to compose repositories but not controllers in flat features', async (context) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'repo-flat-service-'))
    context.after(() => rm(root, { recursive: true, force: true }))
    const featureRoot = path.join(root, 'servers', 'api', 'orders')
    await mkdir(featureRoot, { recursive: true })
    await writeFile(path.join(featureRoot, 'orders.service.ts'), "import './orders.repository.ts';\nimport './orders.controller.ts';\n", 'utf8')
    await writeFile(path.join(featureRoot, 'orders.repository.ts'), 'export {};\n', 'utf8')
    await writeFile(path.join(featureRoot, 'orders.controller.ts'), 'export {};\n', 'utf8')
    const findings = await validateArchitectureBoundaries({
        root,
        architecture: {
            foundation: { ignoredDirectories: [] },
            boundaries: { serviceCannotImportFileRoles: ['route', 'controller', 'model'] }
        },
        projects: [{ name: 'api', type: 'server', root: 'servers/api' }]
    })
    assert.equal(findings.length, 1)
    assert.equal(findings[0].rule, 'service-isolation')
})

