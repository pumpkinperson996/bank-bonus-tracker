import { z } from 'zod'

// Shared contract for all modules. Money is whole USD dollars.
// Dates are ISO strings: YYYY-MM-DD.

export const ApplicationStatusSchema = z.enum(['unreviewed', 'ineligible', 'denied'])
export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>
export type BankScope = 'nationwide' | 'regional'

export const EligibilityRuleSchema = z
  .object({
    kind: z.enum([
      'current_account',
      'account_history',
      'bonus_history',
      'membership_history',
      'calendar_limit',
      'household_limit',
      'lifetime_limit',
      'other',
    ]),
    months: z.number().int().positive().nullable(),
    anchor: z.enum(['open', 'close', 'bonus']).nullable(),
    description: z.string().trim().min(1),
  })
  .strict()
export const EligibilityRulesSchema = z.array(EligibilityRuleSchema)
export type EligibilityRule = z.infer<typeof EligibilityRuleSchema>

// One bonus tier on an offer page (pages often have several).
export const TierSchema = z.object({
  tier_name: z.string().nullable(),
  product_name: z.string().nullable(),
  account_type: z.string().nullable(),
  bonus_amount: z.number().nullable(),
  requirements: z.string().nullable(),
  dd_amount: z.number().nullable(),
  dd_count: z.number().int().nullable(),
  deadline_days: z.number().int().nullable(),
  min_hold_days: z.number().int().nullable(),
  fee_note: z.string().nullable(),
  early_close_penalty: z.string().nullable(),
})
export type Tier = z.infer<typeof TierSchema>

// What the extraction LLM must return: offer-level fields + one tier per
// distinct bonus found. All nullable — partial results are fine.
export const ExtractionSchema = z.object({
  bank_name: z.string().nullable(),
  expires_on: z.string().nullable(),
  churnable: z.boolean().nullable(),
  churn_interval_months: z.number().int().nullable(),
  // Cooldown anchor: counts from last bonus received, or from account closure.
  churn_from: z.enum(['close', 'bonus']).nullable(),
  tiers: z.array(TierSchema),
})
export type Extraction = z.infer<typeof ExtractionSchema>

// What the Claude Code gap search must return: a patch that fills nulls only.
// All keys optional — the search returns whatever it found.
export const GapSearchSchema = z.object({
  churnable: z.boolean().nullable().optional(),
  churn_interval_months: z.number().int().nullable().optional(),
  churn_from: z.enum(['close', 'bonus']).nullable().optional(),
  expires_on: z.string().nullable().optional(),
  source_note: z.string().nullable().optional(),
  tiers: z
    .array(
      z.object({
        index: z.number().int(),
        product_name: z.string().nullable().optional(),
        account_type: z.string().nullable().optional(),
        fee_note: z.string().nullable().optional(),
        early_close_penalty: z.string().nullable().optional(),
        min_hold_days: z.number().int().nullable().optional(),
        deadline_days: z.number().int().nullable().optional(),
        dd_amount: z.number().nullable().optional(),
        dd_count: z.number().int().nullable().optional(),
      })
    )
    .optional(),
})
export type GapSearch = z.infer<typeof GapSearchSchema>

// Response of POST /api/extract — extraction merged with search, plus flags.
export type ExtractionResult = Extraction & {
  churn_source_note: string | null
  fetch_failed: boolean
  search_used: boolean
  search_skipped: boolean
}

export interface Offer {
  id: number
  bank_name: string
  product_name: string | null
  account_type: string | null
  early_close_penalty: string | null
  bonus_amount: number | null
  requirements: string | null
  dd_amount: number | null
  dd_count: number | null
  deadline_days: number | null
  churnable: boolean | null
  churn_interval_months: number | null
  churn_from: 'close' | 'bonus' | null
  churn_source_note: string | null
  eligibility_rules: EligibilityRule[]
  min_hold_days: number | null
  expires_on: string | null
  fee_note: string | null
  notes: string | null
  source: string | null
  created_at: string
  import_key: string | null
  doc_url: string | null
  doc_checked_on: string | null
  churn_source_url: string | null
  bank_scope: BankScope | null
  closure_method: string | null
  closure_source_url: string | null
  application_status: ApplicationStatus
  application_status_reason: string | null
  application_denied_on: string | null
}
export type OfferInput = Omit<Offer, 'id' | 'created_at' | 'eligibility_rules'> & {
  eligibility_rules?: EligibilityRule[]
}

// DD progress is derived from dd_events (count), not stored as a counter.
export interface Account {
  id: number
  offer_id: number
  opened_on: string
  closed_on: string | null
  bonus_received_on: string | null
  notes: string | null
  // 账户信息 details group — all optional, defaults copied from the offer at creation
  name: string | null
  account_type: string | null
  monthly_fee: string | null
  early_close_penalty: string | null
  min_hold_days: number | null
  created_at: string
  bonus_received_amount: number | null
  // Historical-only rows affect eligibility without inheriting the current offer workflow.
  history_only: boolean
}

export interface DdEvent {
  id: number
  account_id: number
  happened_on: string | null
  amount: number | null
  source_note: string | null
}

export interface Settings {
  base_url: string
  model: string
  api_key: string
}

export const DEFAULT_SETTINGS: Settings = {
  base_url: 'https://api.deepseek.com',
  model: 'deepseek-v4-flash',
  api_key: '',
}

// Provider removes these aliases 2026-07-24; both map to deepseek-v4-flash.
export const DEPRECATED_MODELS: Record<string, string> = {
  'deepseek-chat': 'deepseek-v4-flash',
  'deepseek-reasoner': 'deepseek-v4-flash',
}

// One configured LLM provider; the pipeline always consumes the active one, resolved to Settings.
export interface Provider {
  name: string
  base_url: string
  api_key: string
  model: string
}

export interface ProviderSettings {
  providers: Provider[]
  active_provider: string
}

// UI presets: picking one pre-fills base_url; credentials/models are per-user.
export const PRESET_PROVIDERS: { name: string; base_url: string }[] = [
  { name: 'DeepSeek', base_url: 'https://api.deepseek.com' },
  { name: 'OpenAI', base_url: 'https://api.openai.com/v1' },
  { name: 'Qwen', base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  { name: 'Kimi', base_url: 'https://api.moonshot.cn/v1' },
  { name: 'Gemini', base_url: 'https://generativelanguage.googleapis.com/v1beta/openai' },
  { name: 'OpenRouter', base_url: 'https://openrouter.ai/api/v1' },
  { name: 'Groq', base_url: 'https://api.groq.com/openai/v1' },
  { name: 'Ollama', base_url: 'http://localhost:11434/v1' },
]
