function parseField(field: string, min: number, max: number): Set<number> {
  const values = new Set<number>()
  for (const part of field.split(",")) {
    if (part === "*") {
      for (let i = min; i <= max; i++) values.add(i)
    } else if (part.includes("/")) {
      const [range, stepStr] = part.split("/")
      const step = parseInt(stepStr, 10)
      const start = range === "*" ? min : parseInt(range, 10)
      for (let i = start; i <= max; i += step) values.add(i)
    } else if (part.includes("-")) {
      const [startStr, endStr] = part.split("-")
      const s = parseInt(startStr, 10)
      const e = parseInt(endStr, 10)
      for (let i = s; i <= e; i++) values.add(i)
    } else {
      values.add(parseInt(part, 10))
    }
  }
  return values
}

interface ParsedCron {
  minutes: Set<number>
  hours: Set<number>
  days: Set<number>
  months: Set<number>
  weekdays: Set<number>
}

function parseCron(expr: string): ParsedCron {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) throw new Error(`Invalid cron expression: ${expr}`)
  return {
    minutes: parseField(parts[0], 0, 59),
    hours: parseField(parts[1], 0, 23),
    days: parseField(parts[2], 1, 31),
    months: parseField(parts[3], 1, 12),
    weekdays: parseField(parts[4], 0, 6),
  }
}

const WEEKDAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function matchesCron(date: Date, tz: string, parsed: ParsedCron): boolean {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  })
  const parts = f.formatToParts(date)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0"
  let h = parseInt(get("hour"), 10)
  if (h === 24) h = 0
  const minute = parseInt(get("minute"), 10)
  const day = parseInt(get("day"), 10)
  const month = parseInt(get("month"), 10)
  const weekday = WEEKDAY_ABBR.indexOf(get("weekday"))
  return (
    parsed.minutes.has(minute) &&
    parsed.hours.has(h) &&
    parsed.days.has(day) &&
    parsed.months.has(month) &&
    parsed.weekdays.has(weekday)
  )
}

export function nextCronRun(expr: string, after: Date, tz: string): Date {
  const parsed = parseCron(expr)
  let candidate = new Date(Math.ceil((after.getTime() + 1) / 60000) * 60000)
  const MAX_MINUTES = 366 * 24 * 60
  for (let i = 0; i < MAX_MINUTES; i++) {
    if (matchesCron(candidate, tz, parsed)) return candidate
    candidate = new Date(candidate.getTime() + 60000)
  }
  throw new Error(`No next run found within 1 year for cron: ${expr}`)
}

export function validateCronExpr(expr: string): boolean {
  try {
    parseCron(expr)
    return true
  } catch {
    return false
  }
}
