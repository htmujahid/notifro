const FRONTEND_URL =
  import.meta.env.PUBLIC_FRONTEND_URL ?? "http://localhost:5173"

export const site = {
  name: "Renderical",
  tagline: "Compose once. Deliver everywhere.",
  description:
    "Renderical is unified notification infrastructure. One compose-once API delivers across Slack, email, Teams, Discord, WhatsApp, Telegram, web push, webhooks, and in-app — with routing rules, fallback chains, scheduling, rate limiting, and a native MCP server for AI agents.",
  url: "https://renderical.com",
  email: "hello@renderical.com",
  frontendUrl: FRONTEND_URL,
  signinUrl: `${FRONTEND_URL}/auth/sign-in`,
  signupUrl: `${FRONTEND_URL}/auth/sign-up`,
  repoUrl: "https://github.com/htmujahid/renderical",
  selfHostUrl: "/self-host",
  docsUrl: "/developers",
  ogImage: "/og.png", // 1200×630, resolved to an absolute URL in BaseLayout
  twitter: "@renderical", // Twitter/X handle for twitter:site & twitter:creator
  locale: "en_US",
  themeColor: "#FFFFFF",
}

export const nav = [
  { label: "Features", href: "/features" },
  { label: "Channels", href: "/channels" },
  { label: "MCP Server", href: "/mcp" },
  { label: "Developers", href: "/developers" },
  { label: "Self-host", href: "/self-host" },
  { label: "Security", href: "/security" },
]

export const channels = [
  { name: "Slack", note: "Block Kit" },
  { name: "Gmail / SMTP", note: "Responsive HTML" },
  { name: "Microsoft Teams", note: "Adaptive cards" },
  { name: "Discord", note: "Rich embeds" },
  { name: "Web Push", note: "Service workers" },
  { name: "In-App Inbox", note: "Drop-in feed" },
  { name: "Webhooks", note: "Signed & replay-safe" },
  { name: "SMS", note: "Fallback tier" },
  { name: "WhatsApp", note: "Twilio-powered" },
  { name: "Telegram", note: "Bot API" },
]
