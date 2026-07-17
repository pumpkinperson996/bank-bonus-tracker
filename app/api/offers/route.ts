import { NextResponse } from 'next/server'
import { createOffer, listOffers, listAccounts, listDdEvents } from '@/lib/db'
import { ApplicationStatusSchema, normalizeApplicationOutcome } from '@/lib/offer-validation'
import { EligibilityRulesSchema, type OfferInput } from '@/lib/types'

export const runtime = 'nodejs'

export async function GET() {
  const offers = listOffers().map((o) => ({
    ...o,
    accounts: listAccounts(o.id).map((a) => ({ ...a, dd_events: listDdEvents(a.id) })),
  }))
  return NextResponse.json(offers)
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object' || typeof body.bank_name !== 'string' || !body.bank_name.trim()) {
    return NextResponse.json({ error: 'bank_name is required' }, { status: 400 })
  }

  const parsedStatus = ApplicationStatusSchema.safeParse(body.application_status ?? 'unreviewed')
  if (!parsedStatus.success) {
    return NextResponse.json({ error: 'invalid application status' }, { status: 400 })
  }
  if (
    body.application_status_reason !== undefined &&
    body.application_status_reason !== null &&
    typeof body.application_status_reason !== 'string'
  ) {
    return NextResponse.json({ error: 'application status reason must be text' }, { status: 400 })
  }
  if (
    body.application_denied_on !== undefined &&
    body.application_denied_on !== null &&
    typeof body.application_denied_on !== 'string'
  ) {
    return NextResponse.json({ error: 'application denied date must be text' }, { status: 400 })
  }

  let outcome
  try {
    outcome = normalizeApplicationOutcome(
      parsedStatus.data,
      body.application_status_reason ?? null,
      body.application_denied_on ?? null
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'invalid application outcome' },
      { status: 400 }
    )
  }

  const parsedRules = EligibilityRulesSchema.safeParse(body.eligibility_rules ?? [])
  if (!parsedRules.success) {
    return NextResponse.json({ error: 'invalid eligibility rules' }, { status: 400 })
  }

  const input: OfferInput = {
    bank_name: body.bank_name.trim(),
    product_name: body.product_name ?? null,
    account_type: body.account_type ?? null,
    early_close_penalty: body.early_close_penalty ?? null,
    bonus_amount: body.bonus_amount ?? null,
    requirements: body.requirements ?? null,
    dd_amount: body.dd_amount ?? null,
    dd_count: body.dd_count ?? null,
    deadline_days: body.deadline_days ?? null,
    churnable: body.churnable ?? null,
    churn_interval_months: body.churn_interval_months ?? null,
    churn_from: body.churn_from === 'close' || body.churn_from === 'bonus' ? body.churn_from : null,
    churn_source_note: body.churn_source_note ?? null,
    eligibility_rules: parsedRules.data,
    min_hold_days: body.min_hold_days ?? null,
    expires_on: body.expires_on ?? null,
    fee_note: body.fee_note ?? null,
    notes: body.notes ?? null,
    source: body.source ?? null,
    import_key: body.import_key ?? null,
    doc_url: body.doc_url ?? null,
    doc_checked_on: body.doc_checked_on ?? null,
    churn_source_url: body.churn_source_url ?? null,
    bank_scope:
      body.bank_scope === 'nationwide' || body.bank_scope === 'regional'
        ? body.bank_scope
        : null,
    closure_method: body.closure_method ?? null,
    closure_source_url: body.closure_source_url ?? null,
    ...outcome,
  }
  return NextResponse.json(createOffer(input), { status: 201 })
}
