import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  getAccount: vi.fn(),
  updateAccount: vi.fn(),
  deleteAccount: vi.fn(),
}))

vi.mock('@/lib/db', () => db)

import { PATCH } from '@/app/api/accounts/[id]/route'

const request = (body: unknown) =>
  new Request('http://localhost/api/accounts/9', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

const account = {
  id: 9,
  offer_id: 7,
  opened_on: '2026-07-01',
  closed_on: null,
  bonus_received_on: '2026-07-17',
  bonus_received_amount: 300,
  history_only: false,
  notes: null,
  name: null,
  account_type: null,
  monthly_fee: null,
  early_close_penalty: null,
  min_hold_days: null,
  created_at: '2026-07-01',
}

beforeEach(() => {
  vi.clearAllMocks()
  db.getAccount.mockReturnValue(account)
  db.updateAccount.mockImplementation((id, patch) => ({ ...account, ...patch, id }))
})

describe('account actual bonus API', () => {
  it('clears date and amount together when received is unchecked', async () => {
    const response = await PATCH(request({ bonus_received_on: null }), {
      params: Promise.resolve({ id: '9' }),
    })
    expect(response.status).toBe(200)
    expect(db.updateAccount).toHaveBeenCalledWith(9, {
      bonus_received_on: null,
      bonus_received_amount: null,
    })
  })

  it('persists a finite nonnegative actual amount', async () => {
    const response = await PATCH(request({ bonus_received_amount: 450 }), {
      params: Promise.resolve({ id: '9' }),
    })
    expect(response.status).toBe(200)
    expect(db.updateAccount).toHaveBeenCalledWith(9, { bonus_received_amount: 450 })
  })

  it('rejects negative actual amounts', async () => {
    const response = await PATCH(request({ bonus_received_amount: -1 }), {
      params: Promise.resolve({ id: '9' }),
    })
    expect(response.status).toBe(400)
    expect(db.updateAccount).not.toHaveBeenCalled()
  })

  it('rejects an amount when the account is not marked received', async () => {
    db.getAccount.mockReturnValue({ ...account, bonus_received_on: null, bonus_received_amount: null })
    const response = await PATCH(request({ bonus_received_amount: 450 }), {
      params: Promise.resolve({ id: '9' }),
    })
    expect(response.status).toBe(400)
    expect(db.updateAccount).not.toHaveBeenCalled()
  })

  it('rejects a close date before the account was opened', async () => {
    const response = await PATCH(request({ closed_on: '2026-06-30' }), {
      params: Promise.resolve({ id: '9' }),
    })
    expect(response.status).toBe(400)
    expect(db.updateAccount).not.toHaveBeenCalled()
  })

  it('rejects a bonus date before the account was opened', async () => {
    const response = await PATCH(request({ bonus_received_on: '2026-06-30' }), {
      params: Promise.resolve({ id: '9' }),
    })
    expect(response.status).toBe(400)
    expect(db.updateAccount).not.toHaveBeenCalled()
  })

  it('rejects impossible calendar dates', async () => {
    const response = await PATCH(request({ closed_on: '2026-02-30' }), {
      params: Promise.resolve({ id: '9' }),
    })
    expect(response.status).toBe(400)
    expect(db.updateAccount).not.toHaveBeenCalled()
  })
})
