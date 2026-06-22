import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@notifro/ui/components/accordion"

export interface FaqItem {
  q: string
  a: string
}

export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <Accordion className="mx-auto max-w-2xl rounded-xl border bg-card px-5">
      {items.map((item, i) => (
        <AccordionItem key={i} value={`item-${i}`}>
          <AccordionTrigger className="text-base">{item.q}</AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            {item.a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
