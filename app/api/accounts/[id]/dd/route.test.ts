import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  getAccount: vi.fn(),
  addDdEvent: vi.fn(),
}))

vi.mock('@/lib/db', () => db)

import { POST } from '@/app/api/accounts/[id]/dd/route'

const request = (body: unknown) =>
  new Request('http://localhost/api/accounts/9/dd', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

beforeEach(() => {
  vi.clearAllMocks()
  db.getAccount.mockReturnValue({
    id: 9,
    opened_on: '2020-01-01',
    closed_on: '2020-12-31',
  })
  db.addDdEvent.mockImplementation((accountId, event) => ({ id: 1, account_id: accountId, ...event }))
})

describe('historical DD chronology', () => {
  it('accepts a DD during the account lifetime', async () => {
    const response = await POST(request({ happened_on: '2020-06-01', amount: 500 }), {
      params: Promise.resolve({ id: '9' }),
    })
    expect(response.status).toBe(201)
  })

  it('rejects a DD outside the account lifetime', async () => {
    const before = await POST(request({ happened_on: '2019-12-31', amount: 500 }), {
      params: Promise.resolve({ id: '9' }),
    })
    const after = await POST(request({ happened_on: '2021-01-01', amount: 500 }), {
      params: Promise.resolve({ id: '9' }),
    })
    expect(before.status).toBe(400)
    expect(after.status).toBe(400)
    expect(db.addDdEvent).not.toHaveBeenCalled()
  })
})
