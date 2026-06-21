#!/usr/bin/env node
import { createRendericalClient } from '@workspace/sdk'

function getClient() {
  const apiKey = process.env.RENDERICAL_API_KEY
  if (!apiKey) {
    console.error('Error: RENDERICAL_API_KEY environment variable is required')
    process.exit(1)
  }
  const baseUrl = process.env.RENDERICAL_BASE_URL ?? 'http://localhost:8787'
  return createRendericalClient({ baseUrl, apiKey })
}

function usage() {
  console.log(`renderical <command> [options]

Commands:
  send --channel <ch> --to <addr> --subject <s> --body <b>
  preview --channel <ch> --to <addr> --subject <s> --body <b>
  logs [--limit <n>]
  keys list
  keys create --name <n> [--mode live|test]

Environment:
  RENDERICAL_API_KEY   Your Renderical API key (required)
  RENDERICAL_BASE_URL  API base URL (default: http://localhost:8787)
`)
}

function parseArgs(argv: string[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (let i = 0; i < argv.length; i++) {
    if (argv[i]?.startsWith('--')) {
      const key = argv[i]!.slice(2)
      const value = argv[i + 1]
      if (value !== undefined && !value.startsWith('--')) {
        result[key] = value
        i++
      } else {
        result[key] = 'true'
      }
    }
  }
  return result
}

async function cmdSend(args: string[], sandbox: boolean) {
  const flags = parseArgs(args)
  const channel = flags['channel'] ?? 'email'
  const to = flags['to']
  const subject = flags['subject'] ?? ''
  const body = flags['body'] ?? ''

  if (!to) {
    console.error('Error: --to is required')
    process.exit(1)
  }

  const client = getClient()
  const payload = {
    content: { subject, body: { text: body } },
    recipient: { type: 'contact' as const, email: to },
    channels: [channel as import('@workspace/api-client/types').ChannelType],
    sandbox,
  }

  const result = sandbox ? await client.preview(payload) : await client.send(payload)

  console.log(JSON.stringify(result, null, 2))
}

async function cmdLogs(args: string[]) {
  const flags = parseArgs(args)
  const limit = flags['limit'] ?? '20'
  const client = getClient()
  const result = await client.listDeliveries({ limit: Number(limit) })
  console.log(JSON.stringify(result, null, 2))
}

async function cmdKeysList() {
  const client = getClient()
  const result = await client.keys.list()
  for (const key of result.data) {
    const mode = (key.metadata?.mode ?? 'live') as string
    console.log(`${key.id}  ${mode.padEnd(5)}  ${key.start ?? key.prefix ?? ''}...  ${key.name ?? ''}  last used: ${key.lastRequest ?? 'never'}`)
  }
}

async function cmdKeysCreate(args: string[]) {
  const flags = parseArgs(args)
  const name = flags['name']
  const mode = (flags['mode'] ?? 'live') as 'live' | 'test'
  if (!name) {
    console.error('Error: --name is required')
    process.exit(1)
  }
  const client = getClient()
  const result = await client.keys.create(name, mode)
  console.log(`Created ${mode} key: ${result.key}`)
  console.log('(This is the only time the key is shown. Store it securely.)')
}

async function main() {
  const argv = process.argv.slice(2)
  const cmd = argv[0]
  const rest = argv.slice(1)

  try {
    if (cmd === 'send') {
      await cmdSend(rest, false)
    } else if (cmd === 'preview') {
      await cmdSend(rest, true)
    } else if (cmd === 'logs') {
      await cmdLogs(rest)
    } else if (cmd === 'keys') {
      const sub = rest[0]
      if (sub === 'list') {
        await cmdKeysList()
      } else if (sub === 'create') {
        await cmdKeysCreate(rest.slice(1))
      } else {
        usage()
        process.exit(1)
      }
    } else {
      usage()
      if (cmd) process.exit(1)
    }
  } catch (err) {
    console.error('Error:', err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

main()
