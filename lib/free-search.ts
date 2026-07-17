import { GapSearchSchema, type Extraction, type GapSearch, type Settings } from '@/lib/types'
import { fetchPageText } from '@/lib/fetch-page'

const SOURCE_CAP = 12_000
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

// Pure helper: DDG html results page → decoded result URLs, in rank order.
export function parseDdgUrls(html: string): string[] {
  const urls = [...html.matchAll(/uddg=([^&"]+)/g)]
    .map((m) => {
      try {
        return decodeURIComponent(m[1])
      } catch {
        return ''
      }
    })
    .filter((u) => u.startsWith('http'))
  return [...new Set(urls)]
}

// Bing wraps results in bing.com/ck/a redirects; real URL is base64url in the u=a1… param.
// Only b_algo blocks are organic results — chrome/nav links also use ck/a.
export function parseBingUrls(html: string): string[] {
  const urls = html
    .split('<li class="b_algo"')
    .slice(1)
    .map((chunk) => {
      const m = chunk.match(/bing\.com\/ck\/a\?[^"]*?u=a1([A-Za-z0-9_-]+)/)
      if (!m) return ''
      try {
        return Buffer.from(m[1], 'base64url').toString('utf8')
      } catch {
        return ''
      }
    })
    .filter((u) => u.startsWith('http'))
  return [...new Set(urls)]
}

// Keyless engines tried in order until one yields a fetchable page.
// ddg-lite shares DDG's index but is a separate endpoint with independent throttling.
export const SEARCH_ENGINES: {
  name: string
  url: (q: string) => string
  extract: (html: string) => string[]
}[] = [
  { name: 'duckduckgo', url: (q) => `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, extract: parseDdgUrls },
  { name: 'bing', url: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`, extract: parseBingUrls },
  { name: 'duckduckgo-lite', url: (q) => `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(q)}`, extract: parseDdgUrls },
]

// Pure helper: prefer community sources that actually carry churn data.
export function pickSources(urls: string[]): string[] {
  const preferred = urls.filter((u) => /doctorofcredit\.com|reddit\.com/.test(u))
  return (preferred.length ? preferred : urls).slice(0, 2)
}

const norm = (s: string) => s.toLowerCase().replace(/[®™]/g, '').replace(/\s+/g, ' ').trim()

// Identity strings the LLM returns must literally appear in the fetched pages —
// drops hallucinated product/account names. Prose fields are legitimately reworded.
export function groundPatch(patch: GapSearch, sourceTexts: string[]): GapSearch {
  const hay = norm(sourceTexts.join(' '))
  const grounded = <T extends string | null | undefined>(v: T) =>
    v == null || hay.includes(norm(v)) ? v : null
  return {
    ...patch,
    tiers: patch.tiers?.map((t) => ({
      ...t,
      product_name: grounded(t.product_name),
      account_type: grounded(t.account_type),
    })),
  }
}

export function buildQuery(extraction: Extraction): string {
  const t = extraction.tiers[0]
  return [
    extraction.bank_name,
    t?.product_name,
    t?.bonus_amount != null ? `$${t.bonus_amount}` : null,
    'bonus churn doctor of credit',
  ]
    .filter(Boolean)
    .join(' ')
}

const gapPrompt = (
  extraction: Extraction,
  missing: string[],
  sources: { url: string; text: string; engine: string }[]
) => `Here is a US bank account opening bonus offer (JSON):
${JSON.stringify(extraction)}

These fields could not be determined and are missing: ${missing.join(', ')}

Below are web pages that may contain the answers. Using ONLY information in these pages, reply with ONLY a JSON patch object of this shape, where every key is optional: {"churnable": bool, "churn_interval_months": int, "churn_from": "bonus" if the wait counts from the last bonus received or "close" if from account closure, "expires_on": "YYYY-MM-DD", "source_note": "one line summarizing what you found, with the source", "tiers": [{"index": <tier index from the missing list>, "product_name": string, "account_type": string, "fee_note": string, "early_close_penalty": string, "min_hold_days": int, "deadline_days": int, "dd_amount": number, "dd_count": int}]}. Omit anything you did not find. Never contradict values already present in the extraction.

${sources.map((s, i) => `=== SOURCE ${i + 1} (via ${s.engine}): ${s.url} ===\n${s.text}`).join('\n\n')}`

// Free gap search: engine chain → fetch community pages → configured LLM fills nulls.
// Never throws — any failure at any step returns null and the caller degrades.
export async function freeSearchGaps(
  extraction: Extraction,
  missing: string[],
  settings: Settings
): Promise<GapSearch | null> {
  try {
    const query = buildQuery(extraction)
    const sources: { url: string; text: string; engine: string }[] = []
    for (const engine of SEARCH_ENGINES) {
      try {
        const res = await fetch(engine.url(query), {
          signal: AbortSignal.timeout(20_000),
          headers: { 'User-Agent': UA, Accept: 'text/html' },
        })
        if (!res.ok) continue
        for (const url of pickSources(engine.extract(await res.text()))) {
          const text = await fetchPageText(url)
          if (text) sources.push({ url, text: text.slice(0, SOURCE_CAP), engine: engine.name })
        }
        // An engine whose URLs all fail to fetch counts as failed: try the next one.
        if (sources.length > 0) break
      } catch {
        continue
      }
    }
    if (sources.length === 0) return null

    const llm = await fetch(`${settings.base_url.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.api_key}`,
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [
          {
            role: 'system',
            content: 'You fill gaps in bank bonus data from provided web pages. Reply with only JSON.',
          },
          { role: 'user', content: gapPrompt(extraction, missing, sources) },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
      }),
      signal: AbortSignal.timeout(120_000),
    })
    if (!llm.ok) return null
    const content = (await llm.json())?.choices?.[0]?.message?.content
    if (typeof content !== 'string') return null
    const stripped = content.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '')
    const parsed = GapSearchSchema.safeParse(JSON.parse(stripped))
    return parsed.success ? groundPatch(parsed.data, sources.map((s) => s.text)) : null
  } catch {
    return null
  }
}
