import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { readProjectManifest, validateProjectManifest } from './manifest.mjs'

const validProject = {
    name: 'orders-api',
    type: 'server',
    root: 'servers/store/orders-api',
    internalDependencies: [],
    externalDependencies: [],
    capabilities: [],
    tasks: [{ name: 'build', command: 'npm run build' }]
}

test('accepts a valid project manifest', () => {
    assert.deepEqual(validateProjectManifest(validProject), [])
})

test('accepts a config project without invented tasks', () => {
    assert.deepEqual(validateProjectManifest({ ...validProject, name: 'tsconfig', type: 'config', tasks: [] }), [])
})

test('rejects ambiguous project names and types', () => {
    const issues = validateProjectManifest({ ...validProject, name: 'Orders API', type: 'service' })
    assert.equal(issues.filter((issue) => issue.level === 'error').length, 2)
})

test('reports when a project has no name', () => {
    const issues = validateProjectManifest({ ...validProject, name: '' })
    assert.ok(issues.some(({ message }) => message.includes('is missing a name')))
})

test('reads optional manifests, normalizes legacy task environment and filters invalid collection entries', async (context) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'manifest-normalization-'))
    context.after(() => rm(root, { recursive: true, force: true }))
    const projectRoot = path.join(root, 'apps', 'billing')
    await mkdir(projectRoot, { recursive: true })
    assert.equal(await readProjectManifest({ workspaceRoot: root, projectRoot, fallbackType: 'app' }), undefined)
    await writeFile(path.join(projectRoot, 'project.json'), JSON.stringify({
        name: 17, type: false, description: null, internalDependencies: ['@workspace/types', 7], externalDependencies: 'bad', capabilities: ['billing', null],
        tasks: { build: { command: 'pnpm build', env: ['DATABASE_URL', 4], inputs: ['src/**', false], outputs: ['dist', null], dependsOn: ['types:build', null], cache: true }, test: null }
    }))
    const project = await readProjectManifest({ workspaceRoot: root, projectRoot, fallbackType: 'app' })
    assert.equal(project.name, 'apps-billing')
    assert.equal(project.type, 'app')
    assert.equal(project.description, '')
    assert.deepEqual(project.internalDependencies, ['@workspace/types'])
    assert.deepEqual(project.externalDependencies, [])
    assert.deepEqual(project.capabilities, ['billing'])
    assert.deepEqual(project.tasks[0], { name: 'build', command: 'pnpm build', dependsOn: ['types:build'], inputs: ['src/**'], outputs: ['dist'], environment: ['DATABASE_URL'], cache: true })
    assert.equal(project.tasks[1].command, undefined)
    assert.deepEqual(project.tasks[1].environment, [])
})

test('reports missing task commands, unsafe paths, and malformed environment names', () => {
    const issues = validateProjectManifest({ ...validProject, tasks: [
        { name: 'Bad task', command: '', inputs: ['../secret', '/absolute'], outputs: ['nested/../escape'], environment: ['9INVALID', 'SAFE_NAME'] }
    ] })
    assert.ok(issues.some(({ message }) => message.includes('has no command')))
    assert.ok(issues.some(({ message }) => message.includes('invalid task name')))
    assert.equal(issues.filter(({ message }) => message.includes('invalid input path')).length, 2)
    assert.ok(issues.some(({ message }) => message.includes('invalid output path')))
    assert.ok(issues.some(({ message }) => message.includes('invalid environment variable name')))
})
