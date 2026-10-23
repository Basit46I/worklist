import path from 'node:path'
import { toPosixPath } from '../utilities/fs.mjs'

export const sourceExtensions = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts'])
export const importPattern = /(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']|require\(\s*["']([^"']+)["']\s*\)|import\(\s*["']([^"']+)["']\s*\)/g

export const getImports = (source) => [...source.matchAll(importPattern)].map((match) => match[1] ?? match[2] ?? match[3])
export const segmentsOf = (value) => toPosixPath(value).split('/').filter(Boolean)
export const includesSegment = (segments, candidates) => segments.some((segment) => candidates.includes(segment))
export const fileRole = (filePath) => {
    const match = path.basename(filePath).match(/\.([a-z]+)(?:\.[cm]?[jt]sx?)?$/i)
    return match?.[1]?.toLowerCase()
}

export const resolveWorkspaceImport = ({ workspaceRoot, projectRoot, sourceFile, specifier }) => {
    if (specifier.startsWith('.')) return path.resolve(path.dirname(sourceFile), specifier)
    if (specifier.startsWith('@/')) return path.resolve(workspaceRoot, projectRoot, specifier.slice(2))
    const firstSegment = specifier.split('/')[0]
    if (['apps', 'servers', 'packages', 'prebuilt'].includes(firstSegment)) {
        return path.resolve(workspaceRoot, specifier)
    }
    return undefined
}

export const startsWithPath = (value, prefix) => value === prefix || value.startsWith(`${prefix}/`)

export const uiLayer = (projectRelativePath, policy) => {
    if (startsWithPath(projectRelativePath, policy.primitiveRoot ?? 'components/ui')) return 'primitive'
    if (
        (policy.genericRoots ?? []).some((root) => startsWithPath(projectRelativePath, root)) ||
        (policy.genericFiles ?? []).includes(projectRelativePath)
    )
        return 'generic'
    if (startsWithPath(projectRelativePath, policy.featureRoot ?? 'features')) return 'feature'
    if ((policy.applicationRoots ?? []).some((root) => startsWithPath(projectRelativePath, root))) return 'application'
    return undefined
}

export const featureIdentity = (segments) => {
    const index = segments.indexOf('features')
    return index >= 0 && segments[index + 1] ? { name: segments[index + 1], index } : undefined
}

export const issue = (workspaceRoot, sourceFile, specifier, rule, detail) => ({
    level: 'error',
    rule,
    file: toPosixPath(path.relative(workspaceRoot, sourceFile)),
    message: `${toPosixPath(path.relative(workspaceRoot, sourceFile))} imports "${specifier}": ${detail}`
})

export const localIssue = (workspaceRoot, sourceFile, rule, detail) => ({
    level: 'error',
    rule,
    file: toPosixPath(path.relative(workspaceRoot, sourceFile)),
    message: `${toPosixPath(path.relative(workspaceRoot, sourceFile))}: ${detail}`
})

