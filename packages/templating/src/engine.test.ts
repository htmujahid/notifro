import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { renderString, renderValue } from './engine.js'

describe('renderString — variables', () => {
  test('substitutes a simple variable', () => {
    assert.equal(renderString('Hello {{name}}', { name: 'Alice' }), 'Hello Alice')
  })

  test('resolves nested paths', () => {
    assert.equal(renderString('Hi {{user.first}}', { user: { first: 'Bob' } }), 'Hi Bob')
  })

  test('uses default when variable is missing', () => {
    assert.equal(renderString('Hi {{name | "there"}}', {}), 'Hi there')
  })

  test('uses default when variable is undefined', () => {
    assert.equal(renderString('{{x | "fallback"}}', { x: undefined }), 'fallback')
  })

  test('emits empty string for missing variable with no default', () => {
    assert.equal(renderString('{{missing}}', {}), '')
  })

  test('coerces number to string', () => {
    assert.equal(renderString('Count: {{n}}', { n: 42 }), 'Count: 42')
  })
})

describe('renderString — conditionals', () => {
  test('renders then-branch when truthy', () => {
    assert.equal(renderString('{{#if show}}yes{{/if}}', { show: true }), 'yes')
  })

  test('skips then-branch when falsy', () => {
    assert.equal(renderString('{{#if show}}yes{{/if}}', { show: false }), '')
  })

  test('renders else-branch when falsy', () => {
    assert.equal(renderString('{{#if ok}}a{{else}}b{{/if}}', { ok: false }), 'b')
  })

  test('handles nested path in condition', () => {
    assert.equal(renderString('{{#if user.premium}}VIP{{/if}}', { user: { premium: true } }), 'VIP')
  })

  test('treats empty array as falsy', () => {
    assert.equal(renderString('{{#if items}}has{{else}}empty{{/if}}', { items: [] }), 'empty')
  })

  test('treats non-empty array as truthy', () => {
    assert.equal(renderString('{{#if items}}has{{else}}empty{{/if}}', { items: [1] }), 'has')
  })
})

describe('renderString — loops', () => {
  test('iterates over an array', () => {
    assert.equal(renderString('{{#each names as n}}{{n}} {{/each}}', { names: ['A', 'B', 'C'] }), 'A B C ')
  })

  test('exposes itemIndex', () => {
    assert.equal(renderString('{{#each items as i}}{{iIndex}}{{/each}}', { items: ['x', 'y'] }), '01')
  })

  test('skips loop for empty array', () => {
    assert.equal(renderString('{{#each items as i}}{{i}}{{/each}}', { items: [] }), '')
  })

  test('caps at MAX_LOOP_ITERATIONS (100)', () => {
    const items = Array.from({ length: 150 }, (_, i) => i)
    const result = renderString('{{#each items as x}}x{{/each}}', { items })
    assert.equal(result.length, 100)
  })
})

describe('renderString — locale strings', () => {
  const ls = { greeting: 'Bonjour', farewell: 'Au revoir' }

  test('resolves locale string with t. prefix', () => {
    assert.equal(renderString('{{t.greeting}}', {}, ls), 'Bonjour')
  })

  test('falls back to key name when locale string missing', () => {
    assert.equal(renderString('{{t.unknown}}', {}, ls), 't.unknown')
  })

  test('locale string uses default filter', () => {
    assert.equal(renderString('{{t.unknown | "hi"}}', {}, ls), 'hi')
  })
})

describe('renderValue — JSON walk', () => {
  test('renders string values in a plain object', () => {
    assert.deepEqual(renderValue({ title: 'Hello {{name}}', count: 3 }, { name: 'World' }), {
      title: 'Hello World',
      count: 3,
    })
  })

  test('renders strings inside arrays', () => {
    assert.deepEqual(renderValue(['Hi {{a}}', 'Bye {{b}}'], { a: 'X', b: 'Y' }), ['Hi X', 'Bye Y'])
  })

  test('handles nested objects recursively', () => {
    const tpl = { body: { text: '{{msg}}', markdown: '**{{msg}}**' } }
    assert.deepEqual(renderValue(tpl, { msg: 'Hello' }), { body: { text: 'Hello', markdown: '**Hello**' } })
  })

  test('passes through non-string primitives unchanged', () => {
    assert.equal(renderValue(42, {}), 42)
    assert.equal(renderValue(true, {}), true)
    assert.equal(renderValue(null, {}), null)
  })
})

describe('end-to-end compose payload render', () => {
  test('renders a full content object', () => {
    const content = {
      title: 'Hi {{user.name | "there"}}',
      body: {
        text: 'You have {{count}} items.',
        markdown: '{{#if count}}**{{count}} items**{{else}}Nothing{{/if}}',
      },
    }
    const result = renderValue(content, { user: { name: 'Alice' }, count: 3 })
    assert.deepEqual(result, {
      title: 'Hi Alice',
      body: {
        text: 'You have 3 items.',
        markdown: '**3 items**',
      },
    })
  })
})
