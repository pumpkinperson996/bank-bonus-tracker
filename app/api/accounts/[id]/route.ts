import { NextResponse } from 'next/server'
import { getAccount, updateAccount, deleteAccount } from '@/lib/db'
import { accountTimelineError } from '@/lib/account-timeline'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  const id = Number((await params).id)
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
  const current = getAccount(id)
  if (!current) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (body.opened_on !== undefined && typeof body.opened_on !== 'string') {
    return NextResponse.json({ error: 'opened_on must be text' }, { status: 400 })
  }
  if (
    body.closed_on !== undefined &&
    body.closed_on !== null &&
    typeof body.closed_on !== 'string'
  ) {
    return NextResponse.json({ error: 'closed_on must be text or null' }, { status: 400 })
  }
  if (
    body.bonus_received_on !== undefined &&
    body.bonus_received_on !== null &&
    typeof body.bonus_received_on !== 'string'
  ) {
    return NextResponse.json(
      { error: 'bonus_received_on must be YYYY-MM-DD or null' },
      { status: 400 }
    )
  }
  if (
    body.bonus_received_amount !== undefined &&
    body.bonus_received_amount !== null &&
    (typeof body.bonus_received_amount !== 'number' ||
      !Number.isFinite(body.bonus_received_amount) ||
      body.bonus_received_amount < 0)
  ) {
    return NextResponse.json(
      { error: 'bonus_received_amount must be a nonnegative number or null' },
      { status: 400 }
    )
  }

  const resultingReceivedOn =
    body.bonus_received_on !== undefined ? body.bonus_received_on : current.bonus_received_on
  if (body.bonus_received_amount != null && resultingReceivedOn === null) {
    return NextResponse.json(
      { error: 'bonus_received_amount requires a received date' },
      { status: 400 }
    )
  }
  if (body.history_only !== undefined && typeof body.history_only !== 'boolean') {
    return NextResponse.json({ error: 'history_only must be boolean' }, { status: 400 })
  }

  const timelineError = accountTimelineError({
    opened_on: body.opened_on ?? current.opened_on,
    closed_on: body.closed_on !== undefined ? body.closed_on : current.closed_on,
    bonus_received_on: resultingReceivedOn,
  })
  if (timelineError) {
    return NextResponse.json({ error: timelineError }, { status: 400 })
  }

  const patch: Parameters<typeof updateAccount>[1] = {}
  const keys = [
    'opened_on',
    'closed_on',
    'bonus_received_on',
    'bonus_received_amount',
    'history_only',
    'notes',
    'name',
    'account_type',
    'monthly_fee',
    'early_close_penalty',
    'min_hold_days',
  ] as const
  for (const k of keys) if (body[k] !== undefined) (patch as Record<string, unknown>)[k] = body[k]
  if (body.bonus_received_on === null) patch.bonus_received_amount = null
  const account = updateAccount(id, patch)
  if (!account) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(account)
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const id = Number((await params).id)
  if (!deleteAccount(id)) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
