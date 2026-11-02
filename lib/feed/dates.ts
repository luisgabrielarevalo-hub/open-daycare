export const DAYCARE_TIME_ZONE = "America/Argentina/Buenos_Aires";

const DAYCARE_UTC_OFFSET = "-03:00";

const isoDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: DAYCARE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: DAYCARE_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const dateLabelFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: DAYCARE_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "short",
});

export function startOfTodayIso(now: Date = new Date()): string {
  return `${isoDateFormatter.format(now)}T00:00:00${DAYCARE_UTC_OFFSET}`;
}

export function formatTimeLabel(value: string | Date): string {
  return timeFormatter.format(typeof value === "string" ? new Date(value) : value);
}

export function formatDateLabel(value: Date = new Date()): string {
  return dateLabelFormatter
    .format(value)
    .replace(/,/g, "")
    .replace(/\bde\b/g, "")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}
