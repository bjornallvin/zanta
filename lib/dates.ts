// Event dates are plain days (YYYY-MM-DD) and times (HH:MM) in Stockholm time.

const TIME_ZONE = "Europe/Stockholm";

export const isEventDate = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));

export const isEventTime = (value: unknown): value is string =>
  typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

// "12 december 2026"
export function formatEventDay(date: string): string {
  // Noon UTC keeps the same calendar day in every time zone
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TIME_ZONE,
  });
}

// "12 december 2026 kl. 18.00", or just the day without a time
export function formatEventMoment(date: string, time: string | null): string {
  return time ? `${formatEventDay(date)} kl. ${time.replace(":", ".")}` : formatEventDay(date);
}

// Stockholm's offset from UTC in hours at a given instant: 1 in winter, 2 in summer
function stockholmOffsetHours(ms: number): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, timeZoneName: "shortOffset" })
    .formatToParts(new Date(ms))
    .find((p) => p.type === "timeZoneName")?.value;
  return Number(name?.replace("GMT", "") || 0);
}

// Milliseconds at the event moment in Stockholm time; midnight when there is no time
export function eventStartMs(date: string, time: string | null = null): number {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = (time ?? "00:00").split(":").map(Number);
  const asUtc = Date.UTC(y, m - 1, d, hh, mm);
  return asUtc - stockholmOffsetHours(asUtc) * 3_600_000;
}
