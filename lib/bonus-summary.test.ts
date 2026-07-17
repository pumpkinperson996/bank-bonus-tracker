import { describe, expect, it } from 'vitest'

import { summarizeReceivedBonuses } from '@/lib/bonus-summary'

describe('summarizeReceivedBonuses', () => {
  it('sums actual received amounts only', () => {
    expect(
      summarizeReceivedBonuses([
        { bonus_received_on: '2026-07-01', bonus_received_amount: 300 },
        { bonus_received_on: '2026-07-02', bonus_received_amount: 450 },
        { bonus_received_on: null, bonus_received_amount: 900 },
      ])
    ).toEqual({ total: 750, receivedCount: 2, missingAmountCount: 0 })
  })

  it('reports received rows whose amount is missing', () => {
    expect(
      summarizeReceivedBonuses([
        { bonus_received_on: '2026-07-01', bonus_received_amount: null },
      ])
    ).toEqual({ total: 0, receivedCount: 1, missingAmountCount: 1 })
  })

  it('treats non-finite received amounts as missing', () => {
    expect(
      summarizeReceivedBonuses([
        { bonus_received_on: '2026-07-01', bonus_received_amount: Number.NaN },
        { bonus_received_on: '2026-07-02', bonus_received_amount: Number.POSITIVE_INFINITY },
      ])
    ).toEqual({ total: 0, receivedCount: 2, missingAmountCount: 2 })
  })
})
