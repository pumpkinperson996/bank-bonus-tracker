// Pure date math. ISO strings YYYY-MM-DD, parsed as UTC, whole-day integer arithmetic.

const MS_PER_DAY = 86_400_000;

function parseUTC(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

function formatUTC(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function diffDays(fromMs: number, toMs: number): number {
  return Math.round((toMs - fromMs) / MS_PER_DAY);
}

export function daysSince(eventOn: string | null, today: string): number | null {
  if (eventOn == null) return null;
  return diffDays(parseUTC(eventOn), parseUTC(today));
}

export function daysOpen(openedOn: string | null, today: string): number | null {
  if (openedOn == null) return null;
  return diffDays(parseUTC(openedOn), parseUTC(today));
}

export function ddDeadline(
  openedOn: string | null,
  deadlineDays: number | null,
  today: string
): { deadline: string; daysRemaining: number; overdue: boolean; near: boolean } | null {
  if (openedOn == null || deadlineDays == null) return null;
  const deadlineMs = parseUTC(openedOn) + deadlineDays * MS_PER_DAY;
  const daysRemaining = diffDays(parseUTC(today), deadlineMs);
  return {
    deadline: formatUTC(deadlineMs),
    daysRemaining,
    overdue: daysRemaining < 0,
    near: daysRemaining >= 0 && daysRemaining <= 14,
  };
}

export function safeCloseOn(
  openedOn: string | null,
  minHoldDays: number | null,
  today: string
): { safeOn: string; daysRemaining: number; safeNow: boolean } | null {
  if (openedOn == null || minHoldDays == null) return null;
  const safeMs = parseUTC(openedOn) + minHoldDays * MS_PER_DAY;
  return {
    safeOn: formatUTC(safeMs),
    daysRemaining: diffDays(parseUTC(today), safeMs),
    safeNow: safeMs <= parseUTC(today),
  };
}

export function expiryCountdown(
  expiresOn: string | null,
  today: string
): { daysRemaining: number; expired: boolean } | null {
  if (expiresOn == null) return null;
  const daysRemaining = diffDays(parseUTC(today), parseUTC(expiresOn));
  return { daysRemaining, expired: daysRemaining < 0 };
}

export function payoutWait(
  lastDdOn: string | null,
  receivedOn: string | null,
  today: string
): number | null {
  if (lastDdOn == null) return null;
  return diffDays(parseUTC(lastDdOn), parseUTC(receivedOn ?? today));
}

export function churnEligibleOn(
  closedOn: string | null,
  churnIntervalMonths: number | null,
  today: string
): { eligibleOn: string; daysRemaining: number; eligibleNow: boolean } | null {
  if (closedOn == null || churnIntervalMonths == null) return null;
  const d = new Date(parseUTC(closedOn));
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + churnIntervalMonths);
  // clamp day-of-month overflow: Jan 31 + 1 month = Feb 28/29
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  const eligibleMs = d.getTime();
  return {
    eligibleOn: formatUTC(eligibleMs),
    daysRemaining: diffDays(parseUTC(today), eligibleMs),
    eligibleNow: eligibleMs <= parseUTC(today),
  };
}
