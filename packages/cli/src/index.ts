#!/usr/bin/env node
import { createNotifroClient } from "@notifro/sdk"

function getClient() {
  const apiKey = process.env.NOTIFRO_API_KEY
  if (!apiKey) {
    console.error("Error: NOTIFRO_API_KEY environment variable is required")
    process.exit(1)
  }
  const baseUrl = process.env.NOTIFRO_BASE_URL ?? "http://localhost:8787"
  return createNotifroClient({ baseUrl, apiKey })
}

function usage() {
  console.log(`notifro <command> [options]

Commands:
  send --channel <ch> --to <addr> --subject <s> --body <b>
  logs [--limit <n>]

API keys are managed from the Notifro dashboard.

Environment:
  NOTIFRO_API_KEY   Your Notifro API key (required)
  NOTIFRO_BASE_URL  API base URL (default: http://localhost:8787)
`)
}

function parseArgs(argv: string[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (let i = 0; i < argv.length; i++) {
    if (argv[i]?.startsWith("--")) {
      const key = argv[i]!.slice(2)
      const value = argv[i + 1]
      if (value !== undefined && !value.startsWith("--")) {
        result[key] = value
        i++
      } else {
        result[key] = "true"
      }
    }
  }
  return result
}

async function cmdSend(args: string[]) {
  const flags = parseArgs(args)
  const channel = flags["channel"] ?? "email"
  const to = flags["to"]
  const subject = flags["subject"] ?? ""
  const body = flags["body"] ?? ""

  if (!to) {
    console.error("Error: --to is required")
    process.exit(1)
  }

  const client = getClient()
  const payload = {
    content: { subject, body: { text: body } },
    recipient: { type: "contact" as const, email: to },
    channels: [channel as import("@notifro/api-client/types").ChannelType],
  }

  const result = await client.send(payload)

  console.log(JSON.stringify(result, null, 2))
}

async function cmdLogs(args: string[]) {
  const flags = parseArgs(args)
  const limit = flags["limit"] ?? "20"
  const client = getClient()
  const result = await client.listDeliveries({ limit: Number(limit) })
  console.log(JSON.stringify(result, null, 2))
}

async function main() {
  const argv = process.argv.slice(2)
  const cmd = argv[0]
  const rest = argv.slice(1)

  try {
    if (cmd === "send") {
      await cmdSend(rest)
    } else if (cmd === "logs") {
      await cmdLogs(rest)
    } else {
      usage()
      if (cmd) process.exit(1)
    }
  } catch (err) {
    console.error("Error:", err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

main()
