import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createProjectManifest, generateProject } from './project-generator.mjs'

const architecture = {
    foundation: {
        allowedProjectTypesByRoot: { services: ['server'], applications: ['app'] },
        projectRoots: { apps: 'app', servers: 'server', packages: 'package', config: 'config' }
    }
}

void test('project manifests use their type defaults and keep unknown config types task-free', () => {
    assert.deepEqual(createProjectManifest({ name: 'worklist-ui', type: 'package', description: 'Reusable UI' }), {
        name: 'worklist-ui', type: 'package', description: 'Reusable UI', internalDependencies: [], externalDependencies: [], capabilities: [],
        tasks: { build: { command: 'pnpm run build' }, test: { command: 'pnpm test' }, lint: { command: 'pnpm run lint' } }
    })
    assert.deepEqual(createProjectManifest({ name: 'workspace-config', type: 'config' }).tasks, {})
})

void test('project generator validates names and types, maps allowed roots, and refuses to overwrite manifests', async () => {
    const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'worklist-generator-'))
    try {
        await assert.rejects(generateProject({ workspaceRoot, architecture, name: 'Bad Name', type: 'package' }), /lowercase kebab-case/)
        await assert.rejects(generateProject({ workspaceRoot, architecture, name: 'unknown-unit', type: 'database' }), /Unsupported project type/)

        const generated = await generateProject({ workspaceRoot, architecture, name: 'activity-api', type: 'server' })
        assert.equal(generated.root, path.join(workspaceRoot, 'services', 'activity-api'))
        assert.equal(JSON.parse(await readFile(path.join(generated.root, 'project.json'), 'utf8')).name, 'activity-api')
        await assert.rejects(generateProject({ workspaceRoot, architecture, name: 'activity-api', type: 'server' }), { code: 'EEXIST' })

        const fallback = await generateProject({ workspaceRoot, architecture: { foundation: { projectRoots: { packages: 'package' } } }, name: 'date-utils', type: 'package' })
        assert.equal(fallback.root, path.join(workspaceRoot, 'packages', 'date-utils'))
    } finally {
        await rm(workspaceRoot, { recursive: true, force: true })
    }
})
