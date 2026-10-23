import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorkItemCommentSchema } from '../work-item-comment.validation.js'

void test('comment input trims content and rejects blank comments', () => {
    assert.deepEqual(createWorkItemCommentSchema.parse({ body: '  Needs a small update.  ' }), { body: 'Needs a small update.' })
    assert.equal(createWorkItemCommentSchema.safeParse({ body: '   ' }).success, false)
})

void test('comment input enforces its maximum length', () => {
    assert.equal(createWorkItemCommentSchema.safeParse({ body: 'x'.repeat(2000) }).success, true)
    assert.equal(createWorkItemCommentSchema.safeParse({ body: 'x'.repeat(2001) }).success, false)
})
