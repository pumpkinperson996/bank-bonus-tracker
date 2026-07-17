import { ApplicationStatusSchema, type ApplicationStatus } from '@/lib/types'
import { isIsoDate } from '@/lib/account-timeline'

export { ApplicationStatusSchema }

// Application outcomes for imported offer documents.
//   unreviewed — not yet looked at by a human (reason is always cleared).
//   ineligible  — does not meet program rules (reason optional).
//   denied      — applied and rejected (reason required).
export interface ApplicationOutcome {
  application_status: ApplicationStatus
  application_status_reason: string | null
  application_denied_on: string | null
}

// Normalize raw (status, reason) input into the stored contract shape.
//   denied      requires a non-blank reason after trimming.
//   ineligible  keeps an optional trimmed reason (or null).
//   unreviewed  always clears the reason to null.
export function normalizeApplicationOutcome(
  status: ApplicationStatus,
  reason: string | null,
  deniedOn: string | null = null,
  today = new Date().toISOString().slice(0, 10),
): ApplicationOutcome {
  if (status === 'denied') {
    const trimmed = (reason ?? '').trim()
    if (!trimmed) {
      throw new Error('denial reason is required')
    }
    if (!deniedOn) {
      throw new Error('denial date is required')
    }
    if (!isIsoDate(deniedOn)) {
      throw new Error('denial date must be a real YYYY-MM-DD date')
    }
    if (deniedOn > today) {
      throw new Error('denial date cannot be in the future')
    }
    return {
      application_status: 'denied',
      application_status_reason: trimmed,
      application_denied_on: deniedOn,
    }
  }

  if (status === 'ineligible') {
    return {
      application_status: 'ineligible',
      application_status_reason: reason == null ? null : reason.trim() || null,
      application_denied_on: null,
    }
  }

  return {
    application_status: 'unreviewed',
    application_status_reason: null,
    application_denied_on: null,
  }
}
