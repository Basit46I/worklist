import test from 'node:test'
import assert from 'node:assert/strict'
import { createSessionToken, digestSessionToken, hashPassword, verifyPassword } from '../auth.credentials.js'

void test('password hashes verify only the original password and reject malformed encodings', async () => {
    const encoded = await hashPassword('correct horse battery staple')
    assert.match(encoded, /^scrypt\$32768\$8\$1\$/)
    assert.equal(await verifyPassword('correct horse battery staple', encoded), true)
    assert.equal(await verifyPassword('different password', encoded), false)
    assert.equal(await verifyPassword('anything', 'plain-text'), false)
    assert.equal(await verifyPassword('anything', 'scrypt$1$8$1$c2FsdA$aGFzaA'), false)
})

void test('session tokens are random and their digest is deterministic without exposing the token', () => {
    const token = createSessionToken()
    const otherToken = createSessionToken()
    assert.notEqual(token, otherToken)
    assert.equal(digestSessionToken(token), digestSessionToken(token))
    assert.notEqual(digestSessionToken(token), token)
    assert.equal(digestSessionToken(token).length, 64)
})
