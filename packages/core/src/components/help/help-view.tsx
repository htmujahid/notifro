import { Button } from "@workspace/ui/components/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { BookOpenIcon, MessageCircleIcon, FileTextIcon, VideoIcon } from "lucide-react"
import { FaqItem } from "./faq-item"

const FAQS = [
  {
    q: "How do I send my first notification?",
    a: "Go to Notifications, click 'New notification', choose a channel, fill in your message and recipient, then hit Send. Your notification is delivered in seconds.",
  },
  {
    q: "What channels does Renderical support?",
    a: "Renderical supports Email (via Cloudflare Email), Slack, Push (Web Push API), and Webhooks. More channels including SMS and Teams are on the roadmap.",
  },
  {
    q: "How do schedules work?",
    a: "Schedules use standard cron expressions to define recurrence. When a schedule triggers, Renderical evaluates the audience, renders the template, and dispatches to the configured channel.",
  },
  {
    q: "What is an audience?",
    a: "An audience is a named group of recipients. Static audiences are a fixed list; dynamic audiences re-evaluate a rule at send time (e.g. 'all users expiring in 7 days').",
  },
  {
    q: "How do I use notification templates?",
    a: "Create a template once in the Templates section, then reference it by name when creating a notification or schedule. Templates support variables like {{user.name}} that are filled in at send time.",
  },
  {
    q: "Where can I see if a notification failed?",
    a: "Open the Logs page for a full delivery history. Each entry shows the channel, recipient, status (delivered, failed, bounced), duration, and exact timestamp.",
  },
]

const RESOURCES = [
  { title: "Documentation", description: "Full API reference and integration guides", icon: BookOpenIcon, href: "#" },
  { title: "Quickstart guide", description: "Send your first notification in under 5 minutes", icon: FileTextIcon, href: "#" },
  { title: "Video walkthroughs", description: "Step-by-step screencasts for common workflows", icon: VideoIcon, href: "#" },
  { title: "Community & support", description: "Ask questions and share feedback with the team", icon: MessageCircleIcon, href: "#" },
]

export function HelpView() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Help & Support</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Guides, FAQs, and resources to get the most out of Renderical.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {RESOURCES.map(({ title, description, icon: Icon, href }) => (
          <a key={title} href={href}>
            <Card size="sm" className="h-full transition-colors hover:bg-muted/40 cursor-pointer">
              <CardHeader>
                <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
                  <Icon className="size-4 text-foreground" />
                </div>
                <CardTitle className="mt-2">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          </a>
        ))}
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium">Frequently asked questions</h2>
        <div className="rounded-xl bg-card px-5 ring-1 ring-foreground/10">
          {FAQS.map((faq) => (
            <FaqItem key={faq.q} {...faq} />
          ))}
        </div>
      </section>

      <section className="flex items-center justify-between rounded-xl bg-muted/40 px-6 py-5 ring-1 ring-foreground/10">
        <div>
          <p className="text-sm font-medium">Still stuck?</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Our team usually replies within a few hours.</p>
        </div>
        <Button size="sm" className="gap-1.5">
          <MessageCircleIcon className="size-4" />
          Contact support
        </Button>
      </section>
    </div>
  )
}
