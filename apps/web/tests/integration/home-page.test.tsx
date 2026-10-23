import test from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import HomePage from '../../app/(public)/page'

test('composes environment-derived API configuration into the readiness action', () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.test'
    const markup = renderToStaticMarkup(<HomePage />)
    assert.match(markup, /A clear view of your team/)
    assert.match(markup, /href="https:\/\/api\.example\.test\/ready"/)
})
