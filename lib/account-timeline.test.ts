import { describe, expect, it } from 'vitest'

import { accountTimelineError, ddTimelineError, isIsoDate } from '@/lib/account-timeline'

const TODAY = '2026-07-17'

describe('historical account timeline', () => {
  it('accepts a coherent old account', () => {
    expect(
      accountTimelineError(
        {
          opened_on: '2019-01-01',
          bonus_received_on: '2019-04-01',
          closed_on: '2019-08-01',
        },
        TODAY
      )
    ).toBeNull()
  })

  it('rejects impossible and out-of-order dates', () => {
    expect(isIsoDate('2026-02-30')).toBe(false)
    expect(
      accountTimelineError(
        { opened_on: '2020-01-01', bonus_received_on: null, closed_on: '2019-12-31' },
        TODAY
      )
    ).toMatch(/before opened_on/)
    expect(
      accountTimelineError(
        { opened_on: '2020-01-01', bonus_received_on: '2019-12-31', closed_on: null },
        TODAY
      )
    ).toMatch(/before opened_on/)
    expect(
      accountTimelineError(
        { opened_on: '2020-01-01', bonus_received_on: '2020-06-01', closed_on: '2020-05-01' },
        TODAY
      )
    ).toMatch(/after closed_on/)
  })

  it('rejects future account events', () => {
    expect(
      accountTimelineError(
        { opened_on: '2026-07-18', bonus_received_on: null, closed_on: null },
        TODAY
      )
    ).toMatch(/future/)
  })

  it('keeps DD events inside the account lifetime', () => {
    const account = { opened_on: '2020-01-01', closed_on: '2020-12-31' }
    expect(ddTimelineError(account, '2020-06-01', TODAY)).toBeNull()
    expect(ddTimelineError(account, '2019-12-31', TODAY)).toMatch(/before opened_on/)
    expect(ddTimelineError(account, '2021-01-01', TODAY)).toMatch(/after closed_on/)
  })
})
