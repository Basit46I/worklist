import assert from 'node:assert/strict'
import test from 'node:test'
import { renderWorklistEmail } from './template.js'

void test('email template escapes user content and includes an accessible fallback link', () => {
    const html = renderWorklistEmail({ title: '<img src=x>', description: 'A & B', actionLabel: 'Accept invitation', actionUrl: 'https://example.com/join?token=abc&next=home', details: [{ label: 'Task', value: '<script>alert(1)</script>' }] })
    assert.doesNotMatch(html, /<script>|<img src=x>/)
    assert.match(html, /&lt;img src=x&gt;/)
    assert.match(html, /A &amp; B/)
    assert.match(html, /token=abc&amp;next=home/)
    assert.match(html, /Button not working/)
    assert.match(html, /role="presentation"/)
    assert.throws(() => renderWorklistEmail({ title: 'Test', description: '', actionLabel: 'Open', actionUrl: 'javascript:alert(1)' }), /HTTP/)
})
