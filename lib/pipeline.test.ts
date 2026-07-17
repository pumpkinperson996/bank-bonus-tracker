import { describe, expect, it, vi } from 'vitest'
import { runExtraction } from '@/lib/pipeline'
import { ExtractionSchema, DEFAULT_SETTINGS, type Extraction, type Settings, type Tier } from '@/lib/types'

const settings: Settings = { ...DEFAULT_SETTINGS, api_key: 'k' }

const tier: Tier = {
  tier_name: 'Checking $300',
  product_name: 'Chase Total Checking',
  account_type: 'Checking',
  bonus_amount: 300,
  requirements: 'One DD of $500',
  dd_amount: 500,
  dd_count: 1,
  deadline_days: 90,
  min_hold_days: 180,
  fee_note: '$12/mo, waived with DD',
  early_close_penalty: '$25 if closed within 6 months',
}

const fullExtraction: Extraction = {
  bank_name: 'Chase',
  expires_on: '2026-12-31',
  churnable: true,
  churn_interval_months: 24,
  churn_from: 'bonus',
  tiers: [tier],
}

function deps(overrides: Partial<Record<'fetchPage' | 'extract' | 'searchFree', any>> = {}) {
  return {
    fetchPage: vi.fn().mockResolvedValue('fetched text'),
    extract: vi.fn().mockResolvedValue(structuredClone(fullExtraction)),
    searchFree: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
}

describe('runExtraction', () => {
  it('fetches URL input and feeds fetched text to extract', async () => {
    const d = deps()
    const res = await runExtraction('https://example.com/offer', settings, d)
    expect(d.fetchPage).toHaveBeenCalledWith('https://example.com/offer')
    expect(d.extract).toHaveBeenCalledWith('fetched text', settings)
    expect(res.fetch_failed).toBe(false)
  })

  it('fetch failure sets fetch_failed and extracts from raw input', async () => {
    const d = deps({ fetchPage: vi.fn().mockResolvedValue(null) })
    const res = await runExtraction('http://example.com/offer', settings, d)
    expect(res.fetch_failed).toBe(true)
    expect(d.extract).toHaveBeenCalledWith('http://example.com/offer', settings)
  })

  it('text input skips fetch', async () => {
    const d = deps()
    await runExtraction('Chase $300 bonus terms...', settings, d)
    expect(d.fetchPage).not.toHaveBeenCalled()
    expect(d.extract).toHaveBeenCalledWith('Chase $300 bonus terms...', settings)
  })

  it('nothing missing: search never called', async () => {
    const d = deps()
    const res = await runExtraction('some text', settings, d)
    expect(d.searchFree).not.toHaveBeenCalled()
    expect(res.search_used).toBe(false)
    expect(res.search_skipped).toBe(false)
  })

  it('missing churn only: search called with dot paths, filled, note set', async () => {
    const d = deps({
      extract: vi.fn().mockResolvedValue({
        ...structuredClone(fullExtraction),
        churnable: null,
        churn_interval_months: null,
      }),
      searchFree: vi.fn().mockResolvedValue({
        churnable: true,
        churn_interval_months: 12,
        source_note: 'DoC: churnable every 12mo',
      }),
    })
    const res = await runExtraction('some text', settings, d)
    expect(d.searchFree).toHaveBeenCalledWith(
      expect.objectContaining({ bank_name: 'Chase' }),
      ['churnable', 'churn_interval_months'],
      settings
    )
    expect(res.churnable).toBe(true)
    expect(res.churn_interval_months).toBe(12)
    expect(res.churn_source_note).toBe('DoC: churnable every 12mo')
    expect(res.search_used).toBe(true)
    expect(res.search_skipped).toBe(false)
  })

  it('missing tier fields filled per index: patch for index 1 lands on tier 1 only', async () => {
    const tiers = [
      structuredClone(tier),
      { ...structuredClone(tier), tier_name: 'Savings $200', account_type: null, early_close_penalty: null },
    ]
    const d = deps({
      extract: vi.fn().mockResolvedValue({ ...structuredClone(fullExtraction), tiers }),
      searchFree: vi.fn().mockResolvedValue({
        tiers: [{ index: 1, account_type: 'Savings', early_close_penalty: '$50 within 90 days' }],
      }),
    })
    const res = await runExtraction('some text', settings, d)
    expect(d.searchFree).toHaveBeenCalledWith(
      expect.anything(),
      ['tiers[1].account_type', 'tiers[1].early_close_penalty'],
      settings
    )
    expect(res.tiers[0].account_type).toBe('Checking')
    expect(res.tiers[1].account_type).toBe('Savings')
    expect(res.tiers[1].early_close_penalty).toBe('$50 within 90 days')
    expect(res.search_used).toBe(true)
  })

  it('non-null extracted value never overwritten by patch', async () => {
    const tiers = [{ ...structuredClone(tier), min_hold_days: null }]
    const d = deps({
      extract: vi.fn().mockResolvedValue({
        ...structuredClone(fullExtraction),
        expires_on: '2026-12-31',
        tiers,
      }),
      searchFree: vi.fn().mockResolvedValue({
        expires_on: '2027-01-15',
        tiers: [{ index: 0, fee_note: 'DIFFERENT fee note', min_hold_days: 180 }],
      }),
    })
    const res = await runExtraction('some text', settings, d)
    expect(res.expires_on).toBe('2026-12-31')
    expect(res.tiers[0].fee_note).toBe('$12/mo, waived with DD')
    expect(res.tiers[0].min_hold_days).toBe(180) // null slot filled
    expect(res.search_used).toBe(true)
  })

  it('out-of-range tier index ignored without throwing', async () => {
    const d = deps({
      extract: vi.fn().mockResolvedValue({ ...structuredClone(fullExtraction), churnable: null }),
      searchFree: vi.fn().mockResolvedValue({
        churnable: false,
        tiers: [{ index: 5, account_type: 'Savings' }],
      }),
    })
    const res = await runExtraction('some text', settings, d)
    expect(res.churnable).toBe(false)
    expect(res.tiers).toHaveLength(1)
    expect(res.search_used).toBe(true)
  })

  it('search returns null: fields stay null, search_skipped', async () => {
    const d = deps({
      extract: vi.fn().mockResolvedValue({
        ...structuredClone(fullExtraction),
        churnable: null,
        churn_interval_months: null,
      }),
    })
    const res = await runExtraction('some text', settings, d)
    expect(d.searchFree).toHaveBeenCalled()
    expect(res.churnable).toBeNull()
    expect(res.search_used).toBe(false)
    expect(res.search_skipped).toBe(true)
  })

  it('patch returned but nothing usable: search_skipped', async () => {
    const d = deps({
      extract: vi.fn().mockResolvedValue({ ...structuredClone(fullExtraction), churnable: null }),
      searchFree: vi.fn().mockResolvedValue({}),
    })
    const res = await runExtraction('some text', settings, d)
    expect(res.search_used).toBe(false)
    expect(res.search_skipped).toBe(true)
  })

  it('partial fill: filled slot lands, rest stays null, search_used', async () => {
    const d = deps({
      extract: vi.fn().mockResolvedValue({
        ...structuredClone(fullExtraction),
        churnable: null,
        churn_interval_months: null,
      }),
      searchFree: vi.fn().mockResolvedValue({ churnable: true }),
    })
    const res = await runExtraction('some text', settings, d)
    expect(res.churnable).toBe(true)
    expect(res.churn_interval_months).toBeNull()
    expect(res.search_used).toBe(true)
    expect(res.search_skipped).toBe(false)
  })

  it('bank_name null: search not attempted', async () => {
    const d = deps({
      extract: vi.fn().mockResolvedValue({
        ...structuredClone(fullExtraction),
        bank_name: null,
        churnable: null,
      }),
    })
    const res = await runExtraction('some text', settings, d)
    expect(d.searchFree).not.toHaveBeenCalled()
    expect(res.search_skipped).toBe(true)
  })

  it('churn_from and dd fields are searchable gaps', async () => {
    const tiers = [{ ...structuredClone(tier), dd_amount: null, dd_count: null }]
    const d = deps({
      extract: vi.fn().mockResolvedValue({ ...structuredClone(fullExtraction), churn_from: null, tiers }),
      searchFree: vi.fn().mockResolvedValue({
        churn_from: 'close',
        tiers: [{ index: 0, dd_amount: 3000, dd_count: 2 }],
      }),
    })
    const res = await runExtraction('some text', settings, d)
    expect(d.searchFree).toHaveBeenCalledWith(
      expect.anything(),
      ['churn_from', 'tiers[0].dd_amount', 'tiers[0].dd_count'],
      settings
    )
    expect(res.churn_from).toBe('close')
    expect(res.tiers[0].dd_amount).toBe(3000)
    expect(res.tiers[0].dd_count).toBe(2)
    expect(res.search_used).toBe(true)
  })

  it('multi-tier extraction passes through intact', async () => {
    const tiers = [
      { ...structuredClone(tier), tier_name: 'Checking $300', bonus_amount: 300 },
      { ...structuredClone(tier), tier_name: 'Savings $200', bonus_amount: 200 },
      { ...structuredClone(tier), tier_name: 'Combined $900', bonus_amount: 900 },
    ]
    const d = deps({
      extract: vi.fn().mockResolvedValue({ ...structuredClone(fullExtraction), tiers }),
    })
    const res = await runExtraction('some text', settings, d)
    expect(res.tiers).toEqual(tiers)
  })
})

describe('ExtractionSchema', () => {
  it('rejects malformed extraction (wrong types)', () => {
    expect(ExtractionSchema.safeParse({ ...fullExtraction, churnable: 'yes' }).success).toBe(false)
    expect(ExtractionSchema.safeParse({ bank_name: 'Chase' }).success).toBe(false)
  })

  it('rejects malformed tier (bonus_amount as string)', () => {
    expect(
      ExtractionSchema.safeParse({ ...fullExtraction, tiers: [{ ...tier, bonus_amount: '300' }] }).success
    ).toBe(false)
  })

  it('accepts zero tiers', () => {
    expect(ExtractionSchema.safeParse({ ...fullExtraction, tiers: [] }).success).toBe(true)
  })

  it('accepts multi-tier extraction', () => {
    expect(ExtractionSchema.safeParse({ ...fullExtraction, tiers: [tier, tier, tier] }).success).toBe(true)
  })
})
