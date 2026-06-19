export const site = {
  name: "Renderical",
  tagline: "Compose once. Deliver everywhere.",
  description:
    "Renderical is the unified notification infrastructure for product teams. One compose-once API delivers across Slack, email, Teams, Discord, push, and in-app — with fallback chains, scope-based OAuth, a built-in preference center, and a native MCP server for AI agents.",
  url: "https://renderical.com",
  // Where the product app lives (sign in / sign up / dashboard).
  appUrl: "/app",
  signupUrl: "/app/sign-up",
  signinUrl: "/app/sign-in",
  docsUrl: "/developers",
  email: "hello@renderical.com",
};

export const nav = [
  { label: "Features", href: "/features" },
  { label: "Channels", href: "/channels" },
  { label: "MCP Server", href: "/mcp" },
  { label: "Developers", href: "/developers" },
  { label: "Pricing", href: "/pricing" },
  { label: "Security", href: "/security" },
];

export const channels = [
  { name: "Slack", color: "#4a154b", note: "Blocks & interactive" },
  { name: "Gmail / SMTP", color: "#ea4335", note: "Responsive HTML" },
  { name: "Microsoft Teams", color: "#6264a7", note: "Adaptive cards" },
  { name: "Discord", color: "#5865f2", note: "Rich embeds" },
  { name: "Mobile Push", color: "#34c759", note: "APNs / FCM" },
  { name: "Web Push", color: "#f59e0b", note: "Service workers" },
  { name: "In-App Inbox", color: "#5b54f0", note: "Drop-in feed" },
  { name: "Webhooks", color: "#0ea5e9", note: "Signed & replay-safe" },
  { name: "SMS", color: "#ec4899", note: "Fallback tier" },
];
