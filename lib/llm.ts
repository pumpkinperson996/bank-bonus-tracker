import { ExtractionSchema, type Extraction, type Settings } from '@/lib/types'

export class LlmError extends Error {
  kind: 'auth' | 'validation' | 'api'
  constructor(kind: 'auth' | 'validation' | 'api', message: string) {
    super(message)
    this.kind = kind
  }
}

const SYSTEM_PROMPT = `You extract US bank account opening bonus details from text. Return ONLY a JSON object with exactly these keys: bank_name, expires_on, churnable, churn_interval_months, churn_from, tiers. Every value must be null when not determinable from the source. Do not guess.

Offer-level keys: bank_name is the bank's name. expires_on is the last day to apply or open the account, as YYYY-MM-DD. churnable is whether the bonus can be earned again after closing the account. churn_interval_months is the number of months one must wait before earning the bonus again. churn_from says what date that wait counts FROM: "bonus" when the terms count from the last bonus received (e.g. "have not received a bonus on this account in the last 24 months"), "close" when they count from account closure (e.g. "account must have been closed for 12 months"), null when the source does not say.

tiers is an array with one entry for EVERY distinct bonus tier on the page — e.g. a checking-only $300 bonus, a savings-only $200 bonus, and a combined $900 bonus are three separate tiers; deposit-size tiers ($1k deposit → $100, $10k → $300) likewise get one entry each. A page with a single bonus yields exactly one tier. Do not invent tiers that are not on the page. Each tier is an object with exactly these keys: tier_name (short human label, e.g. "Checking $300"), product_name (official account/product name, e.g. "Chase Total Checking"), account_type (Checking / Savings / CD / Money Market / etc.), bonus_amount (plain USD number), requirements (what must be done to earn it), dd_amount (required direct deposit amount, plain USD number), dd_count (number of direct deposits required — read count words: "two or more direct deposits" is 2, "a direct deposit" is 1; plural with no stated count stays null), deadline_days (days from account opening to complete the requirements), min_hold_days (minimum days the account must stay open to avoid an early-close fee or bonus clawback — derive from early-close wording when it names a period: "$25 if closed within 6 months" means 180, "closed within 90 days may forfeit the bonus" means 90), fee_note (the monthly fee and how to waive it), early_close_penalty (the fee or bonus clawback for closing the account early, e.g. "$25 if closed within 6 months").`

export async function extractOffer(source: string, settings: Settings): Promise<Extraction> {
  let res: Response
  try {
    res = await fetch(`${settings.base_url.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.api_key}`,
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: source },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
      }),
    })
  } catch (e) {
    throw new LlmError('api', `LLM request failed: ${e instanceof Error ? e.message : String(e)}`)
  }

  if (res.status === 401 || res.status === 403) {
    throw new LlmError('auth', `Provider rejected the API key (HTTP ${res.status})`)
  }
  if (!res.ok) {
    throw new LlmError('api', `Provider error (HTTP ${res.status})`)
  }

  let content: unknown
  try {
    const data = await res.json()
    content = data?.choices?.[0]?.message?.content
  } catch {
    throw new LlmError('api', 'Provider returned non-JSON response')
  }
  if (typeof content !== 'string') {
    throw new LlmError('api', 'Provider response missing message content')
  }

  // Tolerate ```json fences around the object.
  const stripped = content.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '')
  let parsed: unknown
  try {
    parsed = JSON.parse(stripped)
  } catch {
    throw new LlmError('validation', 'Model output was not valid JSON')
  }
  const result = ExtractionSchema.safeParse(parsed)
  if (!result.success) {
    throw new LlmError('validation', `Model output failed schema validation: ${result.error.message}`)
  }
  return result.data
}
