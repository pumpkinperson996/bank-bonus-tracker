import type { ExtractionResult, Extraction, GapSearch, Settings } from '@/lib/types'
import type { fetchPageText } from '@/lib/fetch-page'
import type { extractOffer } from '@/lib/llm'
import type { freeSearchGaps } from '@/lib/free-search'

export interface PipelineDeps {
  fetchPage: typeof fetchPageText
  extract: typeof extractOffer
  searchFree: typeof freeSearchGaps
}

const OFFER_GAP_FIELDS = ['churnable', 'churn_interval_months', 'churn_from', 'expires_on'] as const
const TIER_GAP_FIELDS = [
  'product_name',
  'account_type',
  'fee_note',
  'early_close_penalty',
  'min_hold_days',
  'deadline_days',
  'dd_amount',
  'dd_count',
] as const

export async function runExtraction(
  input: string,
  settings: Settings,
  deps: PipelineDeps
): Promise<ExtractionResult> {
  const isUrl = input.startsWith('http://') || input.startsWith('https://')
  let fetch_failed = false
  let source = input
  if (isUrl) {
    const fetched = await deps.fetchPage(input)
    fetch_failed = fetched === null
    source = fetched ?? input
  }

  const extraction = await deps.extract(source, settings)

  const missing = computeMissing(extraction)
  let churn_source_note: string | null = null
  let search_used = false
  let search_skipped = false

  if (missing.length > 0 && extraction.bank_name !== null) {
    const patch = await deps.searchFree(extraction, missing, settings)
    const filled = patch != null && applyPatch(extraction, patch)
    churn_source_note = (filled && patch.source_note) || null
    search_used = filled
    search_skipped = !filled
  } else if (missing.length > 0) {
    search_skipped = true
  }

  return { ...extraction, churn_source_note, fetch_failed, search_used, search_skipped }
}

// Dot paths of every search-worthy field currently null.
function computeMissing(extraction: Extraction): string[] {
  const missing: string[] = []
  for (const k of OFFER_GAP_FIELDS) if (extraction[k] === null) missing.push(k)
  extraction.tiers.forEach((t, i) => {
    for (const k of TIER_GAP_FIELDS) if (t[k] === null) missing.push(`tiers[${i}].${k}`)
  })
  return missing
}

// Fill null slots only — never overwrite an extracted value. True if anything landed.
function applyPatch(extraction: Extraction, patch: GapSearch): boolean {
  let filled = false
  for (const k of OFFER_GAP_FIELDS) {
    const v = patch[k]
    if (v !== null && v !== undefined && extraction[k] === null) {
      ;(extraction as Record<typeof k, unknown>)[k] = v
      filled = true
    }
  }
  for (const tp of patch.tiers ?? []) {
    const t = extraction.tiers[tp.index]
    if (!t) continue // out-of-range index: ignore
    for (const k of TIER_GAP_FIELDS) {
      const v = tp[k]
      if (v !== null && v !== undefined && t[k] === null) {
        ;(t as Record<typeof k, unknown>)[k] = v
        filled = true
      }
    }
  }
  return filled
}
