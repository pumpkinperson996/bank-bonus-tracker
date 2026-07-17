import { describe, expect, it } from 'vitest'

import { eligibilityRuleState } from '@/lib/eligibility'
import type { EligibilityRule } from '@/lib/types'

const TODAY = '2026-07-17'
const closeRule: EligibilityRule = {
  kind: 'account_history',
  months: 12,
  anchor: 'close',
  description: 'No account in the past 12 months.',
}
const bonusRule: EligibilityRule = {
  kind: 'bonus_history',
  months: 12,
  anchor: 'bonus',
  description: 'No bonus in the past 12 months.',
}

describe('bank-level eligibility state', () => {
  it('uses the newest closure across all historical accounts', () => {
    const state = eligibilityRuleState(
      closeRule,
      [
        { opened_on: '2018-01-01', closed_on: '2019-01-01', bonus_received_on: null },
        { opened_on: '2025-10-01', closed_on: '2026-01-15', bonus_received_on: null },
      ],
      TODAY
    )
    expect(state.cooldown).toMatchObject({ eligibleOn: '2027-01-15', eligibleNow: false })
  })

  it('uses the newest bonus across all historical accounts', () => {
    const state = eligibilityRuleState(
      bonusRule,
      [
        { opened_on: '2018-01-01', closed_on: '2019-01-01', bonus_received_on: '2018-05-01' },
        { opened_on: '2025-10-01', closed_on: '2026-03-01', bonus_received_on: '2026-02-20' },
      ],
      TODAY
    )
    expect(state.cooldown).toMatchObject({ eligibleOn: '2027-02-20', eligibleNow: false })
  })

  it('does not declare a close-anchored rule satisfied while any account remains open', () => {
    const state = eligibilityRuleState(
      closeRule,
      [
        { opened_on: '2018-01-01', closed_on: '2019-01-01', bonus_received_on: null },
        { opened_on: '2026-01-01', closed_on: null, bonus_received_on: null },
      ],
      TODAY
    )
    expect(state.blockedByOpen).toBe(true)
    expect(state.cooldown).toBeNull()
  })
})
