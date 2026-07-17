import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  createOffer: vi.fn(),
  listOffers: vi.fn(() => []),
  listAccounts: vi.fn(() => []),
  listDdEvents: vi.fn(() => []),
  getOffer: vi.fn(),
  updateOffer: vi.fn(),
  deleteOffer: vi.fn(),
  createAccount: vi.fn(),
}))

vi.mock('@/lib/db', () => db)

import { POST as createOfferRoute } from '@/app/api/offers/route'
import { PATCH as updateOfferRoute } from '@/app/api/offers/[id]/route'

const request = (body: unknown) =>
  new Request('http://localhost/api/offers', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

const existingOffer = {
  id: 7,
  bank_name: 'Example Bank',
  product_name: null,
  account_type: 'Personal Checking',
  early_close_penalty: null,
  bonus_amount: 300,
  requirements: null,
  dd_amount: null,
  dd_count: null,
  deadline_days: null,
  churnable: null,
  churn_interval_months: null,
  churn_from: null,
  churn_source_note: null,
  min_hold_days: null,
  expires_on: null,
  fee_note: null,
  notes: 'private',
  source: null,
  created_at: '2026-07-17',
  import_key: 'bbw:51d0e71d-cd21-4991-a48c-4b187570baa1',
  doc_url: 'https://www.doctorofcredit.com/example/',
  doc_checked_on: '2026-07-17',
  churn_source_url: null,
  bank_scope: 'nationwide' as const,
  closure_method: 'Close online',
  closure_source_url: 'https://www.doctorofcredit.com/close/#Example',
  application_status: 'denied' as const,
  application_status_reason: 'Old reason',
  application_denied_on: '2026-07-01',
}

beforeEach(() => {
  vi.clearAllMocks()
  db.createOffer.mockImplementation((input) => ({ id: 1, ...input, created_at: '2026-07-17' }))
  db.getOffer.mockReturnValue(existingOffer)
  db.updateOffer.mockImplementation((id, patch) => ({ ...existingOffer, ...patch, id }))
})

describe('offer API outcomes and provenance', () => {
  it('creates a manual offer with safe defaults for new fields', async () => {
    const response = await createOfferRoute(request({ bank_name: 'Manual Bank' }))
    expect(response.status).toBe(201)
    expect(db.createOffer).toHaveBeenCalledWith(
      expect.objectContaining({
        bank_name: 'Manual Bank',
        import_key: null,
        doc_url: null,
        doc_checked_on: null,
        churn_source_url: null,
        bank_scope: null,
        closure_method: null,
        closure_source_url: null,
        application_status: 'unreviewed',
        application_status_reason: null,
        application_denied_on: null,
      })
    )
  })

  it('rejects denied without a nonblank reason', async () => {
    const response = await createOfferRoute(
      request({
        bank_name: 'Manual Bank',
        application_status: 'denied',
        application_status_reason: '  ',
        application_denied_on: '2026-07-01',
      })
    )
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'denial reason is required' })
    expect(db.createOffer).not.toHaveBeenCalled()
  })

  it('trims a valid denial reason', async () => {
    const response = await createOfferRoute(
      request({
        bank_name: 'Manual Bank',
        application_status: 'denied',
        application_status_reason: ' Chex-sensitive ',
        application_denied_on: '2026-07-01',
      })
    )
    expect(response.status).toBe(201)
    expect(db.createOffer).toHaveBeenCalledWith(
      expect.objectContaining({
        application_status: 'denied',
        application_status_reason: 'Chex-sensitive',
        application_denied_on: '2026-07-01',
      })
    )
  })

  it('rejects denied without a denial date', async () => {
    const response = await createOfferRoute(
      request({
        bank_name: 'Manual Bank',
        application_status: 'denied',
        application_status_reason: 'Chex-sensitive',
      })
    )
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'denial date is required' })
    expect(db.createOffer).not.toHaveBeenCalled()
  })

  it('rejects a denial date in the future', async () => {
    const response = await createOfferRoute(
      request({
        bank_name: 'Manual Bank',
        application_status: 'denied',
        application_status_reason: 'Chex-sensitive',
        application_denied_on: '9999-12-31',
      })
    )
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'denial date cannot be in the future' })
    expect(db.createOffer).not.toHaveBeenCalled()
  })

  it('updates the date on an already denied application', async () => {
    const response = await updateOfferRoute(request({ application_denied_on: '2026-07-05' }), {
      params: Promise.resolve({ id: '7' }),
    })
    expect(response.status).toBe(200)
    expect(db.updateOffer).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        application_status: 'denied',
        application_status_reason: 'Old reason',
        application_denied_on: '2026-07-05',
      })
    )
  })

  it('clears an old reason when status returns to unreviewed', async () => {
    const response = await updateOfferRoute(request({ application_status: 'unreviewed' }), {
      params: Promise.resolve({ id: '7' }),
    })
    expect(response.status).toBe(200)
    expect(db.updateOffer).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        application_status: 'unreviewed',
        application_status_reason: null,
        application_denied_on: null,
      })
    )
  })

  it('rejects unknown status values without writing', async () => {
    const response = await updateOfferRoute(request({ application_status: 'approved' }), {
      params: Promise.resolve({ id: '7' }),
    })
    expect(response.status).toBe(400)
    expect(db.updateOffer).not.toHaveBeenCalled()
  })
})
