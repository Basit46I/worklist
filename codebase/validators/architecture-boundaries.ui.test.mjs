import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { validateArchitectureBoundaries } from './architecture-boundaries.mjs'

test('rejects generic UI importing application UI through an app alias', async (context) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'repo-ui-direction-'))
    context.after(() => rm(root, { recursive: true, force: true }))
    const genericRoot = path.join(root, 'apps', 'web', 'components', 'layout')
    const applicationRoot = path.join(root, 'apps', 'web', 'components', 'workspace')
    await mkdir(genericRoot, { recursive: true })
    await mkdir(applicationRoot, { recursive: true })
    await writeFile(path.join(genericRoot, 'shell.tsx'), "import '@/components/workspace/status';\n", 'utf8')
    await writeFile(path.join(applicationRoot, 'status.tsx'), 'export {};\n', 'utf8')

    const findings = await validateArchitectureBoundaries({
        root,
        architecture: {
            foundation: { ignoredDirectories: [] },
            boundaries: {},
            uiComposition: {
                primitiveRoot: 'components/ui',
                genericRoots: ['components/layout'],
                genericFiles: [],
                applicationRoots: ['components/workspace'],
                featureRoot: 'features',
                shadcnPrimitiveNames: []
            }
        },
        projects: [{ name: 'web', type: 'app', root: 'apps/web' }]
    })

    assert.equal(findings.length, 1)
    assert.equal(findings[0].rule, 'ui-composition-direction')
})

test('rejects named shadcn replacements outside the primitive root', async (context) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'repo-shadcn-ownership-'))
    context.after(() => rm(root, { recursive: true, force: true }))
    const componentRoot = path.join(root, 'apps', 'web', 'components')
    await mkdir(componentRoot, { recursive: true })
    await writeFile(path.join(componentRoot, 'button.tsx'), 'export {};\n', 'utf8')

    const findings = await validateArchitectureBoundaries({
        root,
        architecture: {
            foundation: { ignoredDirectories: [] },
            boundaries: {},
            uiComposition: {
                primitiveRoot: 'components/ui',
                genericRoots: [],
                genericFiles: [],
                applicationRoots: [],
                featureRoot: 'features',
                shadcnPrimitiveNames: ['button']
            }
        },
        projects: [{ name: 'web', type: 'app', root: 'apps/web' }]
    })

    assert.equal(findings.length, 1)
    assert.equal(findings[0].rule, 'shadcn-primitive-ownership')
})

test('rejects generic and feature UI outside their owners', async (context) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'repo-ui-ownership-'))
    context.after(() => rm(root, { recursive: true, force: true }))
    const appRoot = path.join(root, 'apps', 'web')
    const packageRoot = path.join(root, 'packages', 'ui')
    await mkdir(path.join(appRoot, 'components', 'layout'), { recursive: true })
    await mkdir(path.join(packageRoot, 'src', 'features', 'orders'), { recursive: true })
    await writeFile(path.join(appRoot, 'components', 'layout', 'shell.tsx'), 'export {}\n', 'utf8')
    await writeFile(path.join(packageRoot, 'src', 'features', 'orders', 'order-card.tsx'), 'export {}\n', 'utf8')

    const findings = await validateArchitectureBoundaries({
        root,
        architecture: {
            foundation: { ignoredDirectories: [] },
            boundaries: {},
            uiComposition: {
                packageProject: 'ui',
                primitiveRoot: 'src/primitives',
                genericRoots: ['src/components', 'src/compositions'],
                genericFiles: [],
                applicationRoots: ['components/workspace'],
                appForbiddenGenericRoots: ['components/layout'],
                featureRoot: 'features',
                shadcnPrimitiveNames: []
            }
        },
        projects: [
            { name: 'web', type: 'app', root: 'apps/web' },
            { name: 'ui', type: 'package', root: 'packages/ui' }
        ]
    })

    assert.equal(findings.filter(({ rule }) => rule === 'generic-ui-ownership').length, 1)
    assert.equal(findings.filter(({ rule }) => rule === 'feature-ui-ownership').length, 1)
})

test('rejects flat constants dumping grounds', async (context) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'repo-constants-dumping-ground-'))
    context.after(() => rm(root, { recursive: true, force: true }))
    const constantsRoot = path.join(root, 'servers', 'api', 'constants')
    await mkdir(constantsRoot, { recursive: true })
    await writeFile(path.join(constantsRoot, 'errors.ts'), 'export {}\n', 'utf8')
    await writeFile(path.join(constantsRoot, 'http.ts'), 'export {}\n', 'utf8')

    const findings = await validateArchitectureBoundaries({
        root,
        architecture: { foundation: { ignoredDirectories: [] }, boundaries: {} },
        projects: [{ name: 'api', type: 'server', root: 'servers/api' }]
    })

    assert.equal(findings.filter(({ rule }) => rule === 'constants-dumping-ground').length, 1)
})

