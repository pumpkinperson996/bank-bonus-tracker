import type { ApplicationStatus } from '@/lib/types'
import type { Language } from '@/lib/language'

const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, Record<Language, string>> = {
  unreviewed: { zh: '未处理', en: 'Not reviewed' },
  ineligible: { zh: '拿不了优惠', en: 'Ineligible' },
  denied: { zh: '开户被拒绝', en: 'Application denied' },
}

export const applicationStatusLabel = (status: ApplicationStatus, language: Language = 'zh') =>
  APPLICATION_STATUS_LABELS[status][language]

export const shouldShowApplicationStatus = (status: ApplicationStatus, accountCount: number) =>
  status !== 'unreviewed' || accountCount === 0

export function offerSourceLinks(source: {
  doc_url: string | null
  source?: string | null
  churn_source_url: string | null
  closure_source_url: string | null
}) {
  return {
    bankHref: source.doc_url,
    feeHref: source.doc_url ?? source.source ?? null,
    holdHref: source.doc_url,
    churnHref: source.churn_source_url,
    closureHref: source.closure_source_url,
  }
}

export function receivedTogglePatch(
  checked: boolean,
  today: string,
  existingAmount: number | null,
  advertisedAmount: number | null
) {
  if (!checked) {
    return { bonus_received_on: null, bonus_received_amount: null }
  }
  return {
    bonus_received_on: today,
    bonus_received_amount: existingAmount ?? advertisedAmount,
  }
}
