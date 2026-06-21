const MAX_LOOP_ITERATIONS = 100
const MAX_OUTPUT_BYTES = 100_000

type Token =
  | { type: 'text'; value: string }
  | { type: 'var'; path: string; defaultVal?: string }
  | { type: 'if'; cond: string }
  | { type: 'else' }
  | { type: 'endif' }
  | { type: 'each'; items: string; alias: string }
  | { type: 'endeach' }

type Node =
  | { type: 'text'; value: string }
  | { type: 'var'; path: string; defaultVal?: string }
  | { type: 'if'; cond: string; then: Node[]; else: Node[] }
  | { type: 'each'; items: string; alias: string; body: Node[] }

function tokenize(template: string): Token[] {
  const tokens: Token[] = []
  const re = /\{\{([\s\S]+?)\}\}/g
  let lastIndex = 0

  for (const match of template.matchAll(re)) {
    const idx = match.index ?? 0
    if (idx > lastIndex) {
      tokens.push({ type: 'text', value: template.slice(lastIndex, idx) })
    }

    const expr = match[1].trim()

    if (expr.startsWith('#if ')) {
      tokens.push({ type: 'if', cond: expr.slice(4).trim() })
    } else if (expr === '/if') {
      tokens.push({ type: 'endif' })
    } else if (expr === 'else') {
      tokens.push({ type: 'else' })
    } else if (expr.startsWith('#each ')) {
      const m = expr.match(/^#each\s+(\S+)\s+as\s+(\S+)$/)
      if (!m) throw new Error(`Invalid each expression: ${expr}`)
      tokens.push({ type: 'each', items: m[1], alias: m[2] })
    } else if (expr === '/each') {
      tokens.push({ type: 'endeach' })
    } else {
      const pipeIdx = expr.indexOf(' | ')
      if (pipeIdx >= 0) {
        const path = expr.slice(0, pipeIdx).trim()
        const rawDefault = expr.slice(pipeIdx + 3).trim()
        const defaultVal = rawDefault.replace(/^["']|["']$/g, '')
        tokens.push({ type: 'var', path, defaultVal })
      } else {
        tokens.push({ type: 'var', path: expr })
      }
    }

    lastIndex = idx + match[0].length
  }

  if (lastIndex < template.length) {
    tokens.push({ type: 'text', value: template.slice(lastIndex) })
  }

  return tokens
}

function parse(tokens: Token[]): Node[] {
  let pos = 0

  function parseNodes(stopAt: 'endif' | 'endeach' | 'else' | null = null): Node[] {
    const nodes: Node[] = []

    while (pos < tokens.length) {
      const tok = tokens[pos]

      if (stopAt && (tok.type === stopAt || (stopAt === 'else' && (tok.type === 'else' || tok.type === 'endif')))) {
        break
      }
      if (tok.type === 'endif' || tok.type === 'endeach' || tok.type === 'else') {
        break
      }

      if (tok.type === 'text' || tok.type === 'var') {
        nodes.push(tok as Node)
        pos++
      } else if (tok.type === 'if') {
        pos++
        const then = parseNodes()
        let elseNodes: Node[] = []
        if (tokens[pos]?.type === 'else') {
          pos++
          elseNodes = parseNodes()
        }
        if (tokens[pos]?.type === 'endif') pos++
        nodes.push({ type: 'if', cond: tok.cond, then, else: elseNodes })
      } else if (tok.type === 'each') {
        pos++
        const body = parseNodes()
        if (tokens[pos]?.type === 'endeach') pos++
        nodes.push({ type: 'each', items: tok.items, alias: tok.alias, body })
      } else {
        pos++
      }
    }

    return nodes
  }

  return parseNodes()
}

function resolvePath(ctx: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let val: unknown = ctx
  for (const part of parts) {
    if (val == null || typeof val !== 'object') return undefined
    val = (val as Record<string, unknown>)[part]
  }
  return val
}

function isTruthy(val: unknown): boolean {
  if (val === false || val === null || val === undefined || val === 0 || val === '') return false
  if (Array.isArray(val) && val.length === 0) return false
  return true
}

function coerce(val: unknown): string {
  if (val === null || val === undefined) return ''
  if (Array.isArray(val)) return val.map(coerce).join(', ')
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

function evaluateNodes(
  nodes: Node[],
  ctx: Record<string, unknown>,
  localeStrings: Record<string, string>,
  out: { value: string },
): void {
  for (const node of nodes) {
    if (out.value.length > MAX_OUTPUT_BYTES) throw new Error('Template output exceeds size limit')

    if (node.type === 'text') {
      out.value += node.value
    } else if (node.type === 'var') {
      if (node.path.startsWith('t.')) {
        const key = node.path.slice(2)
        const str = localeStrings[key]
        out.value += str !== undefined ? str : (node.defaultVal !== undefined ? node.defaultVal : node.path)
      } else {
        const val = resolvePath(ctx, node.path)
        if (val !== undefined && val !== null) {
          out.value += coerce(val)
        } else if (node.defaultVal !== undefined) {
          out.value += node.defaultVal
        }
      }
    } else if (node.type === 'if') {
      const val = resolvePath(ctx, node.cond)
      evaluateNodes(isTruthy(val) ? node.then : node.else, ctx, localeStrings, out)
    } else if (node.type === 'each') {
      const items = resolvePath(ctx, node.items)
      if (Array.isArray(items)) {
        const len = Math.min(items.length, MAX_LOOP_ITERATIONS)
        for (let i = 0; i < len; i++) {
          const itemCtx = { ...ctx, [node.alias]: items[i], [`${node.alias}Index`]: i }
          evaluateNodes(node.body, itemCtx as Record<string, unknown>, localeStrings, out)
        }
      }
    }
  }
}

export function renderString(
  template: string,
  ctx: Record<string, unknown>,
  localeStrings: Record<string, string> = {},
): string {
  const tokens = tokenize(template)
  const nodes = parse(tokens)
  const out = { value: '' }
  evaluateNodes(nodes, ctx, localeStrings, out)
  return out.value
}

export function renderValue<T>(
  value: T,
  ctx: Record<string, unknown>,
  localeStrings: Record<string, string> = {},
): T {
  if (typeof value === 'string') {
    return renderString(value, ctx, localeStrings) as T
  }
  if (Array.isArray(value)) {
    return value.map((v) => renderValue(v, ctx, localeStrings)) as T
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = renderValue(v, ctx, localeStrings)
    }
    return result as T
  }
  return value
}
