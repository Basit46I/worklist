const concurrencySteps = 4

export const parseLoadOptions = (rawArguments) => {
    const argumentsList = rawArguments.filter((argument) => argument !== '--')
    const options = new Map()
    for (let index = 0; index < argumentsList.length; index += 1) {
        const argument = argumentsList[index]
        if (!argument?.startsWith('--')) continue
        const [key, inlineValue] = argument.slice(2).split('=', 2)
        const value = inlineValue ?? argumentsList[index + 1]
        if (inlineValue === undefined) index += 1
        if (key && value) options.set(key, value)
    }

    const mode = options.get('mode') ?? 'smoke'
    if (mode !== 'smoke' && mode !== 'stress') throw new Error('--mode must be smoke or stress.')
    const target = new URL(options.get('url') ?? `http://127.0.0.1:4000/${mode === 'stress' ? 'auth/session' : 'health'}`)
    if (!['localhost', '127.0.0.1', '::1'].includes(target.hostname) && options.get('allow-remote') !== 'true') {
        throw new Error('Load checks target localhost by default. Pass --allow-remote true only for an authorized test environment.')
    }

    const defaults = mode === 'stress' ? { requests: 1_500, concurrency: 100 } : { requests: 250, concurrency: 20 }
    const requests = Number(options.get('requests') ?? defaults.requests)
    const concurrency = Number(options.get('concurrency') ?? defaults.concurrency)
    const expectedStatus = Number(options.get('expect-status') ?? (mode === 'stress' ? 401 : 200))
    if (!Number.isInteger(requests) || requests < 1 || requests > 100_000) throw new Error('--requests must be between 1 and 100000.')
    if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 500) throw new Error('--concurrency must be between 1 and 500.')
    if (!Number.isInteger(expectedStatus) || expectedStatus < 100 || expectedStatus > 599) throw new Error('--expect-status must be an HTTP status from 100 to 599.')

    return Object.freeze({ mode, target, requests, concurrency, expectedStatus })
}

export const createLoadPhases = ({ mode, requests, concurrency }) => {
    const levels = mode === 'stress'
        ? [...new Set(Array.from({ length: concurrencySteps }, (_, index) => Math.max(1, Math.round((concurrency * (index + 1)) / concurrencySteps))))]
        : [concurrency]
    return levels.map((level, index) => ({
        concurrency: level,
        requests: Math.floor(requests / levels.length) + (index < requests % levels.length ? 1 : 0)
    })).filter((phase) => phase.requests > 0)
}
