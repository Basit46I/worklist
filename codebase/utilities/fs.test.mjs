import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { listDirectories, pathExists, readJsonFile, toPosixPath, toWorkspaceRelativePath, walkFiles, writeJsonFile } from './fs.mjs'

void test('filesystem helpers read JSON, sort folders and files, ignore build trees, and write atomically', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'worklist-fs-'))
    try {
        const nested = path.join(root, 'nested')
        const ignored = path.join(root, 'node_modules')
        await mkdir(nested, { recursive: true })
        await mkdir(ignored, { recursive: true })
        await writeFile(path.join(root, 'data.json'), '{"ready":true}')
        await writeFile(path.join(root, 'invalid.json'), '{invalid')
        await writeFile(path.join(root, 'z.txt'), 'z')
        await writeFile(path.join(root, 'a.txt'), 'a')
        await writeFile(path.join(nested, 'child.txt'), 'child')
        await writeFile(path.join(ignored, 'dependency.js'), 'ignored')

        assert.equal(await pathExists(root), true)
        assert.equal(await pathExists(path.join(root, 'missing')), false)
        assert.deepEqual(await readJsonFile(path.join(root, 'data.json')), { ready: true })
        await assert.rejects(readJsonFile(path.join(root, 'invalid.json')), /Invalid JSON in/)
        assert.deepEqual(await listDirectories(root), [ignored, nested].sort((a, b) => a.localeCompare(b)))
        assert.deepEqual(await listDirectories(path.join(root, 'missing')), [])
        assert.deepEqual(await walkFiles(path.join(root, 'missing')), [])
        assert.deepEqual(await walkFiles(path.join(root, 'a.txt')), [path.join(root, 'a.txt')])
        assert.deepEqual(await walkFiles(root, { ignoredDirectories: new Set(['node_modules']) }), [
            path.join(root, 'a.txt'), path.join(root, 'data.json'), path.join(root, 'invalid.json'), path.join(nested, 'child.txt'), path.join(root, 'z.txt')
        ])
        const output = path.join(root, 'out', 'result.json')
        await writeJsonFile(output, { count: 2 })
        assert.deepEqual(await readJsonFile(output), { count: 2 })
        assert.equal(toPosixPath(path.join('one', 'two')), 'one/two')
        assert.equal(toWorkspaceRelativePath(root, path.join(root, 'nested', 'child.txt')), 'nested/child.txt')
    } finally {
        await rm(root, { recursive: true, force: true })
    }
})
