import type { Moment } from "moment";
import type { IPeriodicity } from "./settings";

export const DEFAULT_DAY_START = "04:00";

export function normalizeDayStart(value: unknown): string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
    ? value
    : DEFAULT_DAY_START;
}

// Compare local clock time, then subtract a calendar day (not a fixed 24 hours).
// Explicitly chosen dates should bypass this helper.
export function getCurrentPeriodDate(
  periodicity: IPeriodicity,
  now: Moment,
  dayStartTime: unknown
): Moment {
  const date = now.clone();
  if (periodicity === "daily") {
    const [hours, minutes] = normalizeDayStart(dayStartTime).split(":").map(Number);
    if (date.hours() * 60 + date.minutes() < hours * 60 + minutes) {
      date.subtract(1, "day");
    }
  }
  return date;
}
