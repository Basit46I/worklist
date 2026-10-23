import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { checkTypeScriptConfiguration, checkTypeScriptTaskCoverage, checkTypeScriptArchitecture } from './workspace-checks.mjs'

test('requires configured strict TypeScript options in TypeScript workspace units', async (context) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'repo-typescript-config-'))
    context.after(() => rm(root, { recursive: true, force: true }))
    const projectRoot = path.join(root, 'apps', 'web')
    await mkdir(projectRoot, { recursive: true })
    await writeFile(path.join(projectRoot, 'index.ts'), 'export const value = 1;\n', 'utf8')
    await writeFile(path.join(projectRoot, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true } }), 'utf8')

    const issues = await checkTypeScriptConfiguration({
        root,
        architecture: {
            foundation: { ignoredDirectories: [] },
            typescript: { requiredCompilerOptions: ['strict', 'noImplicitAny'] }
        },
        projects: [{ name: 'web', root: 'apps/web' }]
    })

    assert.equal(issues.length, 1)
    assert.match(issues[0].message, /compilerOptions\.noImplicitAny/)
})

test('rejects forbidden TypeScript compiler options', async (context) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'repo-typescript-forbidden-config-'))
    context.after(() => rm(root, { recursive: true, force: true }))
    const projectRoot = path.join(root, 'packages', 'ui')
    await mkdir(projectRoot, { recursive: true })
    await writeFile(path.join(projectRoot, 'index.ts'), 'export const value = 1;\n', 'utf8')
    await writeFile(
        path.join(projectRoot, 'tsconfig.json'),
        JSON.stringify({
            compilerOptions: { strict: true, baseUrl: '.', ignoreDeprecations: '6.0' }
        }),
        'utf8'
    )

    const issues = await checkTypeScriptConfiguration({
        root,
        architecture: {
            foundation: { ignoredDirectories: [] },
            typescript: { requiredCompilerOptions: ['strict'], forbiddenCompilerOptions: ['baseUrl', 'ignoreDeprecations'] }
        },
        projects: [{ name: 'ui', root: 'packages/ui' }]
    })

    assert.equal(issues.length, 2)
    assert.ok(issues.some((issue) => issue.message.includes('compilerOptions.baseUrl')))
    assert.ok(issues.some((issue) => issue.message.includes('compilerOptions.ignoreDeprecations')))
})

test('requires approved shared TypeScript config inheritance', async (context) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'repo-typescript-inheritance-'))
    context.after(() => rm(root, { recursive: true, force: true }))
    await mkdir(path.join(root, 'apps', 'web'), { recursive: true })
    await mkdir(path.join(root, 'packages', 'tsconfig'), { recursive: true })
    await writeFile(path.join(root, 'apps', 'web', 'index.ts'), 'export const value = 1;\n', 'utf8')
    await writeFile(path.join(root, 'apps', 'web', 'tsconfig.json'), JSON.stringify({ extends: './local.json' }), 'utf8')
    await writeFile(
        path.join(root, 'packages', 'tsconfig', 'base.json'),
        JSON.stringify({
            compilerOptions: { strict: true, noImplicitAny: true }
        }),
        'utf8'
    )

    const issues = await checkTypeScriptConfiguration({
        root,
        architecture: {
            foundation: { ignoredDirectories: [] },
            typescript: {
                sharedConfigProject: 'tsconfig',
                policyConfigFile: 'base.json',
                presetConfigFiles: [],
                approvedExtendsByProjectType: { app: '@workspace/tsconfig/next.json' },
                requiredCompilerOptions: ['strict', 'noImplicitAny'],
                forbiddenCompilerOptions: ['baseUrl', 'ignoreDeprecations']
            }
        },
        projects: [
            { name: 'web', type: 'app', root: 'apps/web' },
            { name: 'tsconfig', type: 'config', root: 'packages/tsconfig' }
        ]
    })

    assert.equal(issues.length, 1)
    assert.match(issues[0].message, /must extend @workspace\/tsconfig\/next\.json/)
})

test('requires a tsconfig for TypeScript workspace units', async (context) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'repo-typescript-missing-config-'))
    context.after(() => rm(root, { recursive: true, force: true }))
    const projectRoot = path.join(root, 'packages', 'shared')
    await mkdir(projectRoot, { recursive: true })
    await writeFile(path.join(projectRoot, 'index.ts'), 'export {};\n', 'utf8')

    const issues = await checkTypeScriptConfiguration({
        root,
        architecture: { foundation: { ignoredDirectories: [] }, typescript: { requiredCompilerOptions: ['strict'] } },
        projects: [{ name: 'shared', root: 'packages/shared' }]
    })

    assert.equal(issues.length, 1)
    assert.match(issues[0].message, /has no tsconfig\.json/)
})

test('requires lint and typecheck tasks plus ESLint configuration for TypeScript workspace units', async (context) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'repo-typescript-task-coverage-'))
    context.after(() => rm(root, { recursive: true, force: true }))
    const projectRoot = path.join(root, 'apps', 'web')
    await mkdir(projectRoot, { recursive: true })
    await writeFile(path.join(projectRoot, 'index.ts'), 'export const value = 1;\n', 'utf8')

    const issues = await checkTypeScriptTaskCoverage({
        root,
        architecture: { foundation: { ignoredDirectories: [] } },
        projects: [{ name: 'web', root: 'apps/web', tasks: [{ name: 'lint', command: 'eslint .' }] }]
    })

    assert.equal(issues.length, 2)
    assert.ok(issues.some((issue) => issue.message.includes('typecheck task')))
    assert.ok(issues.some((issue) => issue.message.includes('eslint.config.mjs')))
})

test('rejects explicit any and environment defaults in TypeScript workspace units', async (context) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'repo-typescript-architecture-'))
    context.after(() => rm(root, { recursive: true, force: true }))
    const projectRoot = path.join(root, 'apps', 'web')
    await mkdir(path.join(projectRoot, 'validation'), { recursive: true })
    await mkdir(path.join(projectRoot, 'types'), { recursive: true })
    await writeFile(path.join(projectRoot, 'types', 'index.ts'), 'export type Value = any;\n', 'utf8')
    await writeFile(path.join(projectRoot, 'validation', 'env.validation.ts'), 'const port = z.number().default(4000);\n', 'utf8')

    const issues = await checkTypeScriptArchitecture({
        root,
        architecture: {
            foundation: { ignoredDirectories: [] },
            typescript: { disallowExplicitAny: true, requiredTypeBoundaryProjectTypes: ['app'] },
            configuration: {
                environmentValidationFile: 'validation/env.validation.ts',
                forbidDefaultsInEnvironmentValidation: true,
                validationPackages: ['zod']
            }
        },
        projects: [{ name: 'web', type: 'app', root: 'apps/web' }]
    })

    assert.equal(issues.length, 2)
    assert.ok(issues.some((issue) => issue.message.includes('explicit any')))
    assert.ok(issues.some((issue) => issue.message.includes('embeds a default')))
})

