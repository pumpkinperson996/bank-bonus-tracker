import { churnEligibleOn } from '@/lib/dates'
import type { EligibilityRule } from '@/lib/types'

type EligibilityAccount = {
  opened_on: string
  closed_on: string | null
  bonus_received_on: string | null
}

const latest = (dates: Array<string | null>) =>
  dates.filter((date): date is string => date !== null).sort().at(-1) ?? null

export function eligibilityRuleState(
  rule: EligibilityRule,
  accounts: EligibilityAccount[],
  today: string
) {
  const hasOpenAccount = accounts.some(account => account.closed_on === null)
  if (rule.kind === 'current_account') {
    return { rule, blockedByOpen: hasOpenAccount, cooldown: null }
  }

  const blockedByOpen = rule.anchor === 'close' && hasOpenAccount
  const anchorDate =
    rule.anchor === 'bonus'
      ? latest(accounts.map(account => account.bonus_received_on))
      : rule.anchor === 'close'
        ? latest(accounts.map(account => account.closed_on))
        : rule.anchor === 'open'
          ? latest(accounts.map(account => account.opened_on))
          : null

  return {
    rule,
    blockedByOpen,
    cooldown: blockedByOpen ? null : churnEligibleOn(anchorDate, rule.months, today),
  }
}
