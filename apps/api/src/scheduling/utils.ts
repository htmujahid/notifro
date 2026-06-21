function tzParts(date: Date, tz: string) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
  const parts = f.formatToParts(date)
  const get = (t: string) =>
    parseInt(parts.find((p) => p.type === t)?.value ?? "0", 10)
  let h = get("hour")
  if (h === 24) h = 0
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    h,
    m: get("minute"),
    s: get("second"),
  }
}

export function ianaOffsetMs(date: Date, tz: string): number {
  const p = tzParts(date, tz)
  const localMs = Date.UTC(p.year, p.month - 1, p.day, p.h, p.m, p.s)
  return date.getTime() - localMs
}

export function localToUtc(localStr: string, tz: string): Date {
  const clean = localStr.replace(" ", "T").replace(/Z$/, "") + "Z"
  const ref = new Date(clean)
  const offset = ianaOffsetMs(ref, tz)
  return new Date(ref.getTime() + offset)
}

function localMinutes(date: Date, tz: string): number {
  const p = tzParts(date, tz)
  return p.h * 60 + p.m
}

export function isInQuietHours(
  utcNow: Date,
  startHHMM: string,
  endHHMM: string,
  tz: string
): boolean {
  const now = localMinutes(utcNow, tz)
  const [sh, sm] = startHHMM.split(":").map(Number)
  const [eh, em] = endHHMM.split(":").map(Number)
  const start = sh * 60 + sm
  const end = eh * 60 + em
  return start <= end ? now >= start && now < end : now >= start || now < end
}

export function isInDeliveryWindow(
  utcNow: Date,
  windowStart: string,
  windowEnd: string,
  tz: string
): boolean {
  const now = localMinutes(utcNow, tz)
  const [sh, sm] = windowStart.split(":").map(Number)
  const [eh, em] = windowEnd.split(":").map(Number)
  const start = sh * 60 + sm
  const end = eh * 60 + em
  return start <= end ? now >= start && now < end : now >= start || now < end
}

function localDateStr(date: Date, tz: string, h: number, m: number): string {
  const p = tzParts(date, tz)
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`
}

export function nextAllowedTime(
  utcNow: Date,
  endHHMM: string,
  tz: string
): Date {
  const [eh, em] = endHHMM.split(":").map(Number)
  let utcEnd = localToUtc(localDateStr(utcNow, tz, eh, em), tz)
  if (utcEnd.getTime() <= utcNow.getTime()) {
    utcEnd = new Date(utcEnd.getTime() + 24 * 60 * 60 * 1000)
  }
  return utcEnd
}

export function nextWindowStart(
  utcNow: Date,
  windowStartHHMM: string,
  tz: string
): Date {
  const [sh, sm] = windowStartHHMM.split(":").map(Number)
  let utcStart = localToUtc(localDateStr(utcNow, tz, sh, sm), tz)
  if (utcStart.getTime() <= utcNow.getTime()) {
    utcStart = new Date(utcStart.getTime() + 24 * 60 * 60 * 1000)
  }
  return utcStart
}
