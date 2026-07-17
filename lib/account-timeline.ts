export type AccountTimeline = {
  opened_on: string
  closed_on: string | null
  bonus_received_on: string | null
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function accountTimelineError(
  timeline: AccountTimeline,
  today = new Date().toISOString().slice(0, 10)
): string | null {
  if (!isIsoDate(timeline.opened_on)) return 'opened_on must be a real YYYY-MM-DD date'
  if (timeline.closed_on !== null && !isIsoDate(timeline.closed_on)) {
    return 'closed_on must be a real YYYY-MM-DD date or null'
  }
  if (timeline.bonus_received_on !== null && !isIsoDate(timeline.bonus_received_on)) {
    return 'bonus_received_on must be a real YYYY-MM-DD date or null'
  }

  if (timeline.opened_on > today) return 'opened_on cannot be in the future'
  if (timeline.closed_on !== null && timeline.closed_on > today) {
    return 'closed_on cannot be in the future'
  }
  if (timeline.bonus_received_on !== null && timeline.bonus_received_on > today) {
    return 'bonus_received_on cannot be in the future'
  }
  if (timeline.closed_on !== null && timeline.closed_on < timeline.opened_on) {
    return 'closed_on cannot be before opened_on'
  }
  if (timeline.bonus_received_on !== null && timeline.bonus_received_on < timeline.opened_on) {
    return 'bonus_received_on cannot be before opened_on'
  }
  if (
    timeline.closed_on !== null &&
    timeline.bonus_received_on !== null &&
    timeline.bonus_received_on > timeline.closed_on
  ) {
    return 'bonus_received_on cannot be after closed_on'
  }
  return null
}

export function ddTimelineError(
  account: Pick<AccountTimeline, 'opened_on' | 'closed_on'>,
  happenedOn: string | null,
  today = new Date().toISOString().slice(0, 10)
): string | null {
  if (happenedOn === null) return null
  if (!isIsoDate(happenedOn)) return 'happened_on must be a real YYYY-MM-DD date or null'
  if (happenedOn > today) return 'happened_on cannot be in the future'
  if (happenedOn < account.opened_on) return 'happened_on cannot be before opened_on'
  if (account.closed_on !== null && happenedOn > account.closed_on) {
    return 'happened_on cannot be after closed_on'
  }
  return null
}
