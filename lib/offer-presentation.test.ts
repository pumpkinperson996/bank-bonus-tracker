import { describe, expect, it } from 'vitest'

import {
  applicationStatusLabel,
  offerSourceLinks,
  receivedTogglePatch,
  shouldShowApplicationStatus,
} from '@/lib/offer-presentation'

describe('offer presentation helpers', () => {
  it('uses the three required Chinese application labels', () => {
    expect(applicationStatusLabel('unreviewed')).toBe('未处理')
    expect(applicationStatusLabel('ineligible')).toBe('拿不了优惠')
    expect(applicationStatusLabel('denied')).toBe('开户被拒绝')
    expect(applicationStatusLabel('unreviewed', 'en')).toBe('Not reviewed')
    expect(applicationStatusLabel('ineligible', 'en')).toBe('Ineligible')
    expect(applicationStatusLabel('denied', 'en')).toBe('Application denied')
  })

  it('exposes only verified DoC and churn links', () => {
    expect(
      offerSourceLinks({
        doc_url: 'https://www.doctorofcredit.com/offer/',
        churn_source_url: 'https://www.doctorofcredit.com/offer/#comment-1',
        closure_source_url: 'https://www.doctorofcredit.com/close/#Bank',
      })
    ).toEqual({
      bankHref: 'https://www.doctorofcredit.com/offer/',
      feeHref: 'https://www.doctorofcredit.com/offer/',
      holdHref: 'https://www.doctorofcredit.com/offer/',
      churnHref: 'https://www.doctorofcredit.com/offer/#comment-1',
      closureHref: 'https://www.doctorofcredit.com/close/#Bank',
    })
    expect(
      offerSourceLinks({ doc_url: null, churn_source_url: null, closure_source_url: null })
    ).toEqual({
      bankHref: null,
      feeHref: null,
      holdHref: null,
      churnHref: null,
      closureHref: null,
    })
  })

  it('hides only the default unreviewed label after an account is opened', () => {
    expect(shouldShowApplicationStatus('unreviewed', 0)).toBe(true)
    expect(shouldShowApplicationStatus('unreviewed', 1)).toBe(false)
    expect(shouldShowApplicationStatus('ineligible', 1)).toBe(true)
    expect(shouldShowApplicationStatus('denied', 1)).toBe(true)
  })

  it('uses an official monthly-fee source only when no DoC article exists', () => {
    expect(
      offerSourceLinks({
        doc_url: null,
        source: 'https://bank.example/fees',
        churn_source_url: null,
        closure_source_url: null,
      }).feeHref
    ).toBe('https://bank.example/fees')
  })

  it('prefills the advertised amount when marking a bonus received', () => {
    expect(receivedTogglePatch(true, '2026-07-17', null, 400)).toEqual({
      bonus_received_on: '2026-07-17',
      bonus_received_amount: 400,
    })
  })

  it('preserves an existing actual amount and clears date plus amount together', () => {
    expect(receivedTogglePatch(true, '2026-07-17', 450, 400)).toEqual({
      bonus_received_on: '2026-07-17',
      bonus_received_amount: 450,
    })
    expect(receivedTogglePatch(false, '2026-07-17', 450, 400)).toEqual({
      bonus_received_on: null,
      bonus_received_amount: null,
    })
  })
})
