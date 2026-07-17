import { NextResponse } from 'next/server'
import { getAccount, addDdEvent } from '@/lib/db'
import { ddTimelineError } from '@/lib/account-timeline'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Ctx) {
  const accountId = Number((await params).id)
  const account = getAccount(accountId)
  if (!account) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const body = (await req.json().catch(() => null)) ?? {}
  const happenedOn = body.happened_on ?? null
  if (happenedOn !== null && typeof happenedOn !== 'string') {
    return NextResponse.json({ error: 'happened_on must be text or null' }, { status: 400 })
  }
  const timelineError = ddTimelineError(account, happenedOn)
  if (timelineError) {
    return NextResponse.json({ error: timelineError }, { status: 400 })
  }
  const event = addDdEvent(accountId, {
    happened_on: happenedOn,
    amount: body.amount ?? null,
    source_note: body.source_note ?? null,
  })
  return NextResponse.json(event, { status: 201 })
}
