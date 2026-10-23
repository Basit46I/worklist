import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
const keyLength = 64
const workFactor = 32_768
const saltBytes = 16
const maxMemory = 64 * 1024 * 1024

const deriveKey = async (password: string, salt: Buffer): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        scryptCallback(
            password,
            salt,
            keyLength,
            {
                N: workFactor,
                r: 8,
                p: 1,
                maxmem: maxMemory
            },
            (error, derivedKey) => {
                if (error) reject(error)
                else resolve(derivedKey)
            }
        )
    })
}

export const hashPassword = async (password: string): Promise<string> => {
    const salt = randomBytes(saltBytes)
    const hash = await deriveKey(password, salt)
    return `scrypt$${String(workFactor)}$8$1$${salt.toString('base64url')}$${hash.toString('base64url')}`
}

export const verifyPassword = async (password: string, encoded: string): Promise<boolean> => {
    const [algorithm, n, r, p, encodedSalt, encodedHash, extra] = encoded.split('$')
    if (algorithm !== 'scrypt' || n !== String(workFactor) || r !== '8' || p !== '1' || !encodedSalt || !encodedHash || extra) {
        return false
    }
    const salt = Buffer.from(encodedSalt, 'base64url')
    const expected = Buffer.from(encodedHash, 'base64url')
    if (salt.length !== saltBytes || expected.length !== keyLength) return false
    const actual = await deriveKey(password, salt)
    return timingSafeEqual(actual, expected)
}

export const createSessionToken = (): string => randomBytes(32).toString('base64url')

export const digestSessionToken = (token: string): string => createHash('sha256').update(token).digest('hex')
