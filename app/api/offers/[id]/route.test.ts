import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  getOffer: vi.fn(),
  updateOffer: vi.fn(),
  deleteOffer: vi.fn(),
  createAccount: vi.fn(),
}))

vi.mock('@/lib/db', () => db)

import { POST } from '@/app/api/offers/[id]/route'

const request = (body: unknown) =>
  new Request('http://localhost/api/offers/7', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

beforeEach(() => {
  vi.clearAllMocks()
  db.getOffer.mockReturnValue({ id: 7, bank_name: 'U.S. Bank' })
  db.createAccount.mockImplementation((offerId, input) => ({ id: 9, offer_id: offerId, ...input }))
})

describe('historical account creation', () => {
  it('creates a history-only account with all historical dates in one request', async () => {
    const payload = {
      opened_on: '2020-01-15',
      closed_on: '2020-08-20',
      bonus_received_on: '2020-04-01',
      bonus_received_amount: 300,
      history_only: true,
      name: 'Old checking account',
      account_type: 'Checking',
      monthly_fee: null,
      early_close_penalty: null,
      min_hold_days: null,
      notes: 'Imported from old records',
    }

    const response = await POST(request(payload), { params: Promise.resolve({ id: '7' }) })

    expect(response.status).toBe(201)
    expect(db.createAccount).toHaveBeenCalledWith(7, payload)
  })

  it('rejects a historical close date before the opening date', async () => {
    const response = await POST(
      request({ opened_on: '2020-01-15', closed_on: '2019-12-31', history_only: true }),
      { params: Promise.resolve({ id: '7' }) }
    )

    expect(response.status).toBe(400)
    expect(db.createAccount).not.toHaveBeenCalled()
  })
})
