import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync } from 'node:crypto'
import { ensureManagedTruffleHog } from '../../tools/managed-trufflehog.mjs'
import { runTruffleHogScan } from './trufflehog.mjs'

test('managed TruffleHog safely normalizes scanner findings', { timeout: 120_000 }, async () => {
    const { privateKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
        publicKeyEncoding: { type: 'spki', format: 'pem' }
    })
    const tool = await ensureManagedTruffleHog({ workspaceRoot: process.cwd(), requiredVersion: '3.97.5' })
    const scan = await runTruffleHogScan({
        workspaceRoot: process.cwd(),
        policy: {
            version: '3.97.5',
            configuration: '.trufflehog-exclude-paths.txt',
            resultClasses: ['verified', 'unknown', 'unverified']
        },
        toolProvider: async () => tool,
        commandRunner: async ({ command, args }) => {
            assert.equal(command, tool.command)
            assert.deepEqual(args.slice(0, 2), ['filesystem', '.'])
            assert.ok(args.includes('--fail'))
            assert.ok(args.includes('--results=verified,unknown,unverified'))
            return {
                exitCode: 183,
                stdout: `${JSON.stringify({
                    DetectorName: 'PrivateKey',
                    Verified: false,
                    Raw: privateKey,
                    RawV2: privateKey,
                    SourceMetadata: { Data: { Filesystem: { file: 'generated-private-key.pem', line: 1 } } }
                })}\n`,
                stderr: '',
                durationMs: 7
            }
        }
    })

    assert.equal(scan.result.scanStatus, 'findings')
    assert.equal(scan.result.exitCode, 183)
    assert.equal(scan.result.findingCount, 1)
    assert.equal(JSON.stringify(scan).includes(privateKey.slice(32, 72)), false)
})
