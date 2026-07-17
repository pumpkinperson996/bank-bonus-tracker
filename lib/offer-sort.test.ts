import { describe, expect, it } from 'vitest'

import { groupAndSortOffers } from '@/lib/offer-sort'

const offers = [
  {
    bank_name: 'Zulu Bank',
    bonus_amount: 100,
    expires_on: null,
    bank_scope: 'nationwide' as const,
    accounts: [],
  },
  {
    bank_name: 'Opened Regional',
    bonus_amount: 200,
    expires_on: '2026-10-01',
    bank_scope: 'regional' as const,
    accounts: [{ opened_on: '2025-01-01' }],
  },
  {
    bank_name: 'Alpha Bank',
    bonus_amount: 500,
    expires_on: '2026-08-01',
    bank_scope: 'nationwide' as const,
    accounts: [],
  },
  {
    bank_name: 'Opened National',
    bonus_amount: 300,
    expires_on: '2026-09-01',
    bank_scope: 'nationwide' as const,
    accounts: [{ opened_on: '2026-01-01' }],
  },
]

describe('offer sorting and grouping', () => {
  it('always moves banks with an account into the first group', () => {
    const groups = groupAndSortOffers(offers, 'catalog')
    expect(groups.map(group => group.key)).toEqual(['opened', 'nationwide'])
    expect(groups[0].offers.map(offer => offer.bank_name)).toEqual([
      'Opened Regional',
      'Opened National',
    ])
    expect(groups[1].offers.map(offer => offer.bank_name)).toEqual(['Zulu Bank', 'Alpha Bank'])
  })

  it('sorts each visible section without moving opened banks back into the catalog', () => {
    const bonusGroups = groupAndSortOffers(offers, 'bonus-desc')
    expect(bonusGroups[0].offers.map(offer => offer.bonus_amount)).toEqual([300, 200])
    expect(bonusGroups[1].offers.map(offer => offer.bonus_amount)).toEqual([500, 100])

    const nameGroups = groupAndSortOffers(offers, 'bank-asc')
    expect(nameGroups[1].offers.map(offer => offer.bank_name)).toEqual(['Alpha Bank', 'Zulu Bank'])
  })

  it('puts known expiration dates first and unknown dates last', () => {
    const groups = groupAndSortOffers(offers, 'expiry-asc')
    expect(groups[1].offers.map(offer => offer.bank_name)).toEqual(['Alpha Bank', 'Zulu Bank'])
  })

  it('localizes group headings without changing their order', () => {
    const groups = groupAndSortOffers(offers, 'catalog', 'en')
    expect(groups.map(group => group.title)).toEqual([
      'Opened accounts (2)',
      'Nationwide banks (2)',
    ])
  })
})
