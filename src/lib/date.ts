// Shared "what day is it" helper for due/overdue comparisons across the app.
//
// `new Date().toISOString().slice(0, 10)` (used to be scattered across
// tasks/leads/metrics/the overdue-reminder cron) always renders in UTC. For
// an India-based business that's up to 5.5 hours off from the actual local
// day — most visible right around local midnight, where something due
// "today" would still read as due tomorrow, or something from "yesterday"
// would still show as due today. `Intl.DateTimeFormat` with an explicit
// timeZone sidesteps that without adding a timezone library.
const BUSINESS_TIMEZONE = "Asia/Kolkata";

/** Today's date as YYYY-MM-DD in the business's operating timezone (IST). */
export function todayInBusinessTimezone(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TIMEZONE }).format(new Date());
}

/** Midnight today, in the business's operating timezone, as a UTC instant — for comparing against `timestamptz` columns. */
export function startOfTodayInBusinessTimezone(): Date {
  return new Date(`${todayInBusinessTimezone()}T00:00:00+05:30`);
}
