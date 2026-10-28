import { lstat, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const deployDirectory = path.resolve(apiRoot, 'vercel-deploy')

if (path.dirname(deployDirectory) !== apiRoot || path.basename(deployDirectory) !== 'vercel-deploy') {
    throw new Error('Refusing to clean an unexpected API deployment path.')
}

const entry = await lstat(deployDirectory).catch((error) => {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return undefined
    throw error
})

if (entry) {
    if (entry.isSymbolicLink()) throw new Error('Refusing to clean a linked API deployment path.')
    await rm(deployDirectory, { recursive: true, force: true })
}
