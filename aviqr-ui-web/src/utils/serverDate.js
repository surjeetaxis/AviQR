// Every backend timestamp in this app is a Java LocalDateTime (no timezone —
// e.g. "2026-09-09T08:18:57.796295"), always written in the server's clock,
// which is UTC in production. `new Date(str)` on a string with no timezone
// designator treats it as browser-LOCAL time instead, so any viewer not in
// UTC gets every "time ago"/"Xm — urgent" display silently offset by their
// own UTC difference — confirmed live: an order placed seconds ago showed as
// "5h 30m ago — urgent" for an IST browser (UTC+5:30, matching exactly).
// Use this instead of `new Date(ts)` wherever a raw server timestamp needs a
// real elapsed-time calculation.
export function parseServerDate(ts) {
  if (!ts) return null;
  const hasZone = /[Zz]|[+-]\d{2}:?\d{2}$/.test(ts);
  return new Date(hasZone ? ts : ts + 'Z');
}
