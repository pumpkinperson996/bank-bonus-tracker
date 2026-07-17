import { describe, expect, it } from 'vitest'
import {
  ApplicationStatusSchema,
  normalizeApplicationOutcome,
} from './offer-validation'
import type { Offer, OfferInput, Account } from './types'

describe('ApplicationStatusSchema', () => {
  it('accepts unreviewed, ineligible, and denied', () => {
    expect(ApplicationStatusSchema.parse('unreviewed')).toBe('unreviewed')
    expect(ApplicationStatusSchema.parse('ineligible')).toBe('ineligible')
    expect(ApplicationStatusSchema.parse('denied')).toBe('denied')
  })

  it('rejects unknown statuses', () => {
    expect(() => ApplicationStatusSchema.parse('approved')).toThrow()
  })
})

describe('normalizeApplicationOutcome', () => {
  it('rejects denied with a blank reason', () => {
    expect(() => normalizeApplicationOutcome('denied', '   ', '2026-07-01', '2026-07-17')).toThrow(
      'denial reason is required',
    )
  })

  it('rejects denied with a null reason', () => {
    expect(() => normalizeApplicationOutcome('denied', null, '2026-07-01', '2026-07-17')).toThrow(
      'denial reason is required',
    )
  })

  it('requires a real non-future date for denied applications', () => {
    expect(() => normalizeApplicationOutcome('denied', 'Chex', null, '2026-07-17')).toThrow(
      'denial date is required',
    )
    expect(() => normalizeApplicationOutcome('denied', 'Chex', '2026-02-30', '2026-07-17')).toThrow(
      'denial date must be a real YYYY-MM-DD date',
    )
    expect(() => normalizeApplicationOutcome('denied', 'Chex', '2026-07-18', '2026-07-17')).toThrow(
      'denial date cannot be in the future',
    )
  })

  it('trims retained reasons', () => {
    expect(normalizeApplicationOutcome('denied', ' Chex-sensitive ', '2026-07-01', '2026-07-17')).toEqual({
      application_status: 'denied',
      application_status_reason: 'Chex-sensitive',
      application_denied_on: '2026-07-01',
    })
  })

  it('permits an optional reason for ineligible', () => {
    expect(
      normalizeApplicationOutcome('ineligible', ' outside footprint ', '2026-07-01', '2026-07-17'),
    ).toEqual({
      application_status: 'ineligible',
      application_status_reason: 'outside footprint',
      application_denied_on: null,
    })
  })

  it('allows ineligible without a reason', () => {
    expect(normalizeApplicationOutcome('ineligible', null, null, '2026-07-17')).toEqual({
      application_status: 'ineligible',
      application_status_reason: null,
      application_denied_on: null,
    })
  })

  it('clears the reason for unreviewed', () => {
    expect(normalizeApplicationOutcome('unreviewed', 'old denial', '2026-07-01', '2026-07-17')).toEqual({
      application_status: 'unreviewed',
      application_status_reason: null,
      application_denied_on: null,
    })
  })
})

describe('nullable contract fields', () => {
  it('exposes nullable provenance fields on Offer and OfferInput', () => {
    const offer: Offer = {
      id: 1,
      bank_name: 'Bank',
      product_name: null,
      account_type: null,
      early_close_penalty: null,
      bonus_amount: null,
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
      notes: null,
      source: null,
      created_at: '2026-07-17',
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
    }
    const input: OfferInput = { ...offer } as unknown as OfferInput
    delete (input as { id?: number }).id
    delete (input as { created_at?: string }).created_at
    expect(input.import_key).toBeNull()
    expect(input.doc_url).toBeNull()
    expect(input.doc_checked_on).toBeNull()
    expect(input.churn_source_url).toBeNull()
    expect(input.bank_scope).toBeNull()
    expect(input.closure_method).toBeNull()
    expect(input.closure_source_url).toBeNull()
    expect(input.application_status).toBe('unreviewed')
    expect(input.application_status_reason).toBeNull()
    expect(input.application_denied_on).toBeNull()
  })

  it('exposes nullable bonus_received_amount on Account', () => {
    const account: Account = {
      id: 1,
      offer_id: 1,
      opened_on: '2026-01-01',
      closed_on: null,
      bonus_received_on: null,
      notes: null,
      name: null,
      account_type: null,
      monthly_fee: null,
      early_close_penalty: null,
      min_hold_days: null,
      created_at: '2026-01-01',
      bonus_received_amount: null,
      history_only: false,
    }
    expect(account.bonus_received_amount).toBeNull()
  })
})
