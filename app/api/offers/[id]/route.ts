import { NextResponse } from 'next/server'
import { getOffer, updateOffer, deleteOffer, createAccount } from '@/lib/db'
import { ApplicationStatusSchema, normalizeApplicationOutcome } from '@/lib/offer-validation'
import { accountTimelineError } from '@/lib/account-timeline'
import { EligibilityRulesSchema, type OfferInput } from '@/lib/types'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  const id = Number((await params).id)
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
  const current = getOffer(id)
  if (!current) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const patch: Partial<OfferInput> = {}
  const keys = [
    'bank_name',
    'product_name',
    'account_type',
    'early_close_penalty',
    'bonus_amount',
    'requirements',
    'dd_amount',
    'dd_count',
    'deadline_days',
    'churnable',
    'churn_interval_months',
    'churn_from',
    'churn_source_note',
    'eligibility_rules',
    'min_hold_days',
    'expires_on',
    'fee_note',
    'notes',
    'source',
    'import_key',
    'doc_url',
    'doc_checked_on',
    'churn_source_url',
    'bank_scope',
    'closure_method',
    'closure_source_url',
  ] as const
  for (const key of keys) {
    if (body[key] !== undefined) (patch as Record<string, unknown>)[key] = body[key]
  }
  if (body.eligibility_rules !== undefined) {
    const parsedRules = EligibilityRulesSchema.safeParse(body.eligibility_rules)
    if (!parsedRules.success) {
      return NextResponse.json({ error: 'invalid eligibility rules' }, { status: 400 })
    }
    patch.eligibility_rules = parsedRules.data
  }

  if (
    body.application_status !== undefined ||
    body.application_status_reason !== undefined ||
    body.application_denied_on !== undefined
  ) {
    const parsedStatus = ApplicationStatusSchema.safeParse(
      body.application_status ?? current.application_status
    )
    if (!parsedStatus.success) {
      return NextResponse.json({ error: 'invalid application status' }, { status: 400 })
    }
    const rawReason =
      body.application_status_reason !== undefined
        ? body.application_status_reason
        : current.application_status_reason
    if (rawReason !== null && typeof rawReason !== 'string') {
      return NextResponse.json({ error: 'application status reason must be text' }, { status: 400 })
    }
    const rawDeniedOn =
      body.application_denied_on !== undefined
        ? body.application_denied_on
        : current.application_denied_on
    if (rawDeniedOn !== null && typeof rawDeniedOn !== 'string') {
      return NextResponse.json({ error: 'application denied date must be text' }, { status: 400 })
    }
    try {
      Object.assign(patch, normalizeApplicationOutcome(parsedStatus.data, rawReason, rawDeniedOn))
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'invalid application outcome' },
        { status: 400 }
      )
    }
  }

  const offer = updateOffer(id, patch)
  if (!offer) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(offer)
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const id = Number((await params).id)
  if (!deleteOffer(id)) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}

export async function POST(req: Request, { params }: Ctx) {
  const id = Number((await params).id)
  if (!getOffer(id)) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
  const openedOn = body?.opened_on
  const closedOn = body.closed_on ?? null
  const bonusReceivedOn = body.bonus_received_on ?? null
  const bonusReceivedAmount = body.bonus_received_amount ?? null
  if (typeof openedOn !== 'string') {
    return NextResponse.json({ error: 'opened_on is required' }, { status: 400 })
  }
  if (closedOn !== null && typeof closedOn !== 'string') {
    return NextResponse.json({ error: 'closed_on must be text or null' }, { status: 400 })
  }
  if (bonusReceivedOn !== null && typeof bonusReceivedOn !== 'string') {
    return NextResponse.json({ error: 'bonus_received_on must be text or null' }, { status: 400 })
  }
  if (
    bonusReceivedAmount !== null &&
    (typeof bonusReceivedAmount !== 'number' ||
      !Number.isFinite(bonusReceivedAmount) ||
      bonusReceivedAmount < 0)
  ) {
    return NextResponse.json({ error: 'bonus_received_amount must be nonnegative' }, { status: 400 })
  }
  if (bonusReceivedAmount !== null && bonusReceivedOn === null) {
    return NextResponse.json({ error: 'bonus_received_amount requires a received date' }, { status: 400 })
  }
  if (body.history_only !== undefined && typeof body.history_only !== 'boolean') {
    return NextResponse.json({ error: 'history_only must be boolean' }, { status: 400 })
  }
  const timelineError = accountTimelineError({
    opened_on: openedOn,
    closed_on: closedOn,
    bonus_received_on: bonusReceivedOn,
  })
  if (timelineError) {
    return NextResponse.json({ error: timelineError }, { status: 400 })
  }
  return NextResponse.json(
    createAccount(id, {
      opened_on: openedOn,
      closed_on: closedOn,
      bonus_received_on: bonusReceivedOn,
      bonus_received_amount: bonusReceivedAmount,
      history_only: body.history_only ?? false,
      name: body.name ?? null,
      account_type: body.account_type ?? null,
      monthly_fee: body.monthly_fee ?? null,
      early_close_penalty: body.early_close_penalty ?? null,
      min_hold_days: body.min_hold_days ?? null,
      notes: body.notes ?? null,
    }),
    { status: 201 }
  )
}
