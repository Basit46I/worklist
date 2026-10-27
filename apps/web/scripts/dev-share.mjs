import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repositoryRoot = path.resolve(appDirectory, '../..')
const isWindows = process.platform === 'win32'
const ngrokExecutable = isWindows
    ? (process.env.PATH ?? '').split(path.delimiter).flatMap((directory) => [path.join(directory, 'ngrok.exe'), path.join(directory, 'node_modules', 'ngrok', 'bin', 'ngrok.exe')]).find(existsSync) ?? 'ngrok'
    : 'ngrok'
let tunnel
let development
let tunnelStartupError
let stopping = false

const stopChildren = () => {
    if (stopping) return
    stopping = true
    tunnel?.kill()
    development?.kill()
}

const findPublicUrl = async () => {
    for (let attempt = 0; attempt < 60; attempt += 1) {
        if (tunnelStartupError) throw new Error(`Could not start ngrok: ${tunnelStartupError.message}. Install ngrok and authenticate it first.`)
        if (tunnel?.exitCode !== null && tunnel?.exitCode !== undefined) throw new Error('ngrok exited before opening a tunnel.')
        try {
            const response = await fetch('http://127.0.0.1:4040/api/tunnels', { signal: AbortSignal.timeout(1000) })
            if (response.ok) {
                const data = await response.json()
                const url = data.tunnels?.find((entry) => entry.public_url?.startsWith('https://') && entry.config?.addr?.includes(':3000'))?.public_url
                if (url) return url
            }
        } catch {
            // ngrok's local inspector may take a few seconds to start.
        }
        await new Promise((resolve) => setTimeout(resolve, 500))
    }
    throw new Error('Could not find the ngrok public URL. Check that ngrok is installed and authenticated.')
}

try {
    tunnel = spawn(ngrokExecutable, ['http', '3000'], {
        stdio: 'inherit',
        windowsHide: true,
        env: { ...process.env, HOME: process.env.HOME ?? process.env.USERPROFILE }
    })
    tunnel.on('error', (error) => { tunnelStartupError = error })
    process.on('SIGINT', stopChildren)
    process.on('SIGTERM', stopChildren)

    const publicUrl = await findPublicUrl()
    process.stdout.write(`\nWorklist is being shared at ${publicUrl}\nKeep this terminal open while teammates use the app.\n\n`)
    const command = isWindows ? 'pnpm.cmd' : 'pnpm'
    development = spawn(command, ['run', 'dev'], {
        cwd: repositoryRoot,
        env: { ...process.env, WEB_ORIGIN: publicUrl, NEXT_PUBLIC_API_BASE_URL: '/api' },
        stdio: 'inherit',
        windowsHide: true,
        shell: isWindows
    })
    development.on('error', (error) => {
        process.stderr.write(`Could not start the Worklist development servers: ${error.message}\n`)
        stopChildren()
    })
    development.on('exit', stopChildren)
    tunnel.on('exit', stopChildren)
} catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    stopChildren()
    process.exitCode = 1
}
