import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { checkServerFeatureArchitecture } from './workspace-checks.mjs'

test('rejects misplaced and unregistered server feature routes', async (context) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'repo-server-features-'))
    context.after(() => rm(root, { recursive: true, force: true }))
    const serverRoot = path.join(root, 'servers', 'api')
    await mkdir(path.join(serverRoot, 'bootstrap'), { recursive: true })
    await mkdir(path.join(serverRoot, 'routes'), { recursive: true })
    await mkdir(path.join(serverRoot, 'features', 'status', 'routes'), { recursive: true })
    await writeFile(path.join(serverRoot, 'bootstrap', 'create-app.ts'), 'export const createApp = () => undefined;\n', 'utf8')
    await writeFile(path.join(serverRoot, 'routes', 'legacy.route.ts'), 'export const createLegacyRoutes = () => undefined;\n', 'utf8')
    await writeFile(
        path.join(serverRoot, 'features', 'status', 'routes', 'status.route.ts'),
        'export const createStatusRoutes = (_request, response) => response.status(200).json({});\n',
        'utf8'
    )
    await writeFile(
        path.join(serverRoot, 'features', 'status', 'routes', 'index.ts'),
        "export { createStatusRoutes } from './status.route.js';\n",
        'utf8'
    )
    await writeFile(path.join(serverRoot, 'features', 'status', 'index.ts'), "export { createStatusRoutes } from './routes/index.js';\n", 'utf8')

    const issues = await checkServerFeatureArchitecture({
        root,
        architecture: {
            foundation: { ignoredDirectories: [] },
            featureModel: {
                serverFeatureRoot: 'features',
                serverFeatureRegistrationFile: 'bootstrap/create-app.ts',
                serverRouteFileSuffix: '.route.ts'
            }
        },
        projects: [{ name: 'api', type: 'server', root: 'servers/api' }]
    })

    assert.ok(issues.some((issue) => issue.message.includes('routes/legacy.route.ts must live')))
    assert.ok(issues.some((issue) => issue.message.includes('delegate response orchestration to a controller')))
    assert.ok(issues.some((issue) => issue.message.includes('feature status must be explicitly registered')))
})

