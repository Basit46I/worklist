import assert from 'node:assert/strict'
import test from 'node:test'
import { getExecutionProfile } from './profiles.mjs'

void test('execution profiles define local, affected, pull request, main, and release task policies', () => {
    assert.deepEqual(getExecutionProfile('local'), { name: 'local', affected: false, checks: ['check'], tasks: [] })
    assert.deepEqual(getExecutionProfile('affected'), { name: 'affected', affected: true, checks: ['check'], tasks: ['build', 'test'] })
    assert.deepEqual(getExecutionProfile('pull-request'), { name: 'pull-request', affected: true, checks: ['check', 'scan'], tasks: ['build', 'test'] })
    assert.deepEqual(getExecutionProfile('main'), { name: 'main', affected: false, checks: ['check', 'scan'], tasks: ['build', 'test'] })
    assert.deepEqual(getExecutionProfile('release'), { name: 'release', affected: false, checks: ['check', 'scan'], tasks: ['build', 'test', 'artifact'] })
    assert.throws(() => getExecutionProfile('preview'), /Unknown execution profile: preview/)
})
