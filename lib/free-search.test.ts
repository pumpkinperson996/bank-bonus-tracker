import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildQuery, freeSearchGaps, groundPatch, parseBingUrls, parseDdgUrls, pickSources } from '@/lib/free-search'
import { DEFAULT_SETTINGS, type Extraction, type Settings } from '@/lib/types'

const settings: Settings = { ...DEFAULT_SETTINGS, api_key: 'k' }

const extraction: Extraction = {
  bank_name: 'U.S. Bank',
  expires_on: null,
  churnable: null,
  churn_interval_months: null,
  churn_from: null,
  tiers: [
    {
      tier_name: 'Checking $450',
      product_name: 'Smartly Checking',
      account_type: 'Checking',
      bonus_amount: 450,
      requirements: 'DD $8000 in 90 days',
      dd_amount: 8000,
      dd_count: null,
      deadline_days: 90,
      min_hold_days: null,
      fee_note: null,
      early_close_penalty: null,
    },
  ],
}
const missing = ['churnable', 'churn_interval_months']

const ddgHtml = (...urls: string[]) =>
  urls.map((u) => `<a href="//duckduckgo.com/l/?uddg=${encodeURIComponent(u)}&rut=abc">r</a>`).join('\n')

const llmResponse = (patch: unknown) => ({
  ok: true,
  json: async () => ({ choices: [{ message: { content: JSON.stringify(patch) } }] }),
})

const htmlResponse = (body: string) => ({
  ok: true,
  headers: new Headers({ 'content-type': 'text/html' }),
  text: async () => body,
})

afterEach(() => vi.unstubAllGlobals())

describe('parseDdgUrls', () => {
  it('extracts and decodes result URLs in order, deduped', () => {
    const html = ddgHtml('https://a.com/x', 'https://b.com/y', 'https://a.com/x')
    expect(parseDdgUrls(html)).toEqual(['https://a.com/x', 'https://b.com/y'])
  })

  it('ignores non-http and malformed entries', () => {
    expect(parseDdgUrls('uddg=javascript%3Aalert(1)" uddg=%ZZ"')).toEqual([])
  })
})

describe('parseBingUrls', () => {
  const bingRedirect = (url: string) =>
    `<li class="b_algo"><h2><a href="https://www.bing.com/ck/a?!&amp;p=abc&amp;u=a1${Buffer.from(url).toString('base64url')}&amp;ntb=1">r</a></h2></li>`

  it('decodes base64url u= params to real URLs, deduped', () => {
    const html = bingRedirect('https://www.doctorofcredit.com/x') + bingRedirect('https://reddit.com/y') + bingRedirect('https://www.doctorofcredit.com/x')
    expect(parseBingUrls(html)).toEqual(['https://www.doctorofcredit.com/x', 'https://reddit.com/y'])
  })

  it('ignores garbage params', () => {
    expect(parseBingUrls('bing.com/ck/a?u=a1!!!notbase64"')).toEqual([])
  })
})

describe('pickSources', () => {
  it('prefers doctorofcredit/reddit over others, capped at 2', () => {
    expect(
      pickSources([
        'https://forbes.com/a',
        'https://www.doctorofcredit.com/b',
        'https://reddit.com/r/churning/c',
        'https://www.doctorofcredit.com/d',
      ])
    ).toEqual(['https://www.doctorofcredit.com/b', 'https://reddit.com/r/churning/c'])
  })

  it('falls back to top results when no community source matches', () => {
    expect(pickSources(['https://a.com', 'https://b.com', 'https://c.com'])).toEqual([
      'https://a.com',
      'https://b.com',
    ])
  })
})

describe('buildQuery', () => {
  it('combines bank, product, amount, and churn terms', () => {
    expect(buildQuery(extraction)).toBe('U.S. Bank Smartly Checking $450 bonus churn doctor of credit')
  })
})

describe('groundPatch', () => {
  const sources = ['MidFirst Bank offers LiveFree Checking with no monthly fee for everyone.']

  it('drops a product name that appears nowhere in the sources', () => {
    const p = groundPatch(
      { tiers: [{ index: 0, product_name: 'M Checking', account_type: 'Checking', fee_note: 'reworded fee prose' }] },
      sources
    )
    expect(p.tiers![0].product_name).toBeNull()
    expect(p.tiers![0].account_type).toBe('Checking') // appears in "LiveFree Checking"
    expect(p.tiers![0].fee_note).toBe('reworded fee prose') // prose not grounded
  })

  it('keeps names despite ®/case/whitespace differences', () => {
    const p = groundPatch(
      { tiers: [{ index: 0, product_name: 'U.S. Bank  Smartly® Checking' }] },
      ['Open a u.s. bank smartly checking account today']
    )
    expect(p.tiers![0].product_name).toBe('U.S. Bank  Smartly® Checking')
  })

  it('leaves offer-level fields and missing tiers untouched', () => {
    const p = groundPatch({ churnable: true, churn_interval_months: 12 }, sources)
    expect(p).toEqual({ churnable: true, churn_interval_months: 12, tiers: undefined })
  })
})

describe('freeSearchGaps', () => {
  it('happy path: DDG → fetch source → LLM patch validated', async () => {
    const patch = { churnable: true, churn_interval_months: 12, source_note: 'DoC' }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(htmlResponse(ddgHtml('https://www.doctorofcredit.com/usb')))
      .mockResolvedValueOnce(htmlResponse('<p>churnable every 12 months</p>'))
      .mockResolvedValueOnce(llmResponse(patch))
    vi.stubGlobal('fetch', fetchMock)
    expect(await freeSearchGaps(extraction, missing, settings)).toEqual(patch)
    expect(fetchMock.mock.calls[0][0]).toContain('html.duckduckgo.com')
    expect(fetchMock.mock.calls[2][0]).toContain(settings.base_url)
  })

  it('DDG throttled: falls through to Bing and succeeds', async () => {
    const patch = { churnable: true }
    const bingHtml = `<li class="b_algo"><h2><a href="https://www.bing.com/ck/a?u=a1${Buffer.from('https://www.doctorofcredit.com/usb').toString('base64url')}&ntb=1">r</a></h2></li>`
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429 }) // ddg html
      .mockResolvedValueOnce(htmlResponse(bingHtml)) // bing serp
      .mockResolvedValueOnce(htmlResponse('<p>churn info</p>')) // source page
      .mockResolvedValueOnce(llmResponse(patch))
    vi.stubGlobal('fetch', fetchMock)
    expect(await freeSearchGaps(extraction, missing, settings)).toEqual(patch)
    expect(fetchMock.mock.calls[1][0]).toContain('bing.com')
  })

  it('returns null when every engine is throttled', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 429 })
    vi.stubGlobal('fetch', fetchMock)
    expect(await freeSearchGaps(extraction, missing, settings)).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(3) // all three engines tried
  })

  it('engine URLs unfetchable: next engine tried, null when all exhausted', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(htmlResponse(ddgHtml('https://www.doctorofcredit.com/usb'))) // ddg serp ok
      .mockRejectedValue(new Error('blocked')) // page fetch + every later engine call fails
    vi.stubGlobal('fetch', fetchMock)
    expect(await freeSearchGaps(extraction, missing, settings)).toBeNull()
  })

  it('returns null on invalid LLM JSON or schema mismatch', async () => {
    const base = () =>
      vi
        .fn()
        .mockResolvedValueOnce(htmlResponse(ddgHtml('https://www.doctorofcredit.com/usb')))
        .mockResolvedValueOnce(htmlResponse('<p>text</p>'))
    vi.stubGlobal(
      'fetch',
      base().mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { content: 'not json' } }] }) })
    )
    expect(await freeSearchGaps(extraction, missing, settings)).toBeNull()
    vi.unstubAllGlobals()
    vi.stubGlobal('fetch', base().mockResolvedValueOnce(llmResponse({ churnable: 'yes' })))
    expect(await freeSearchGaps(extraction, missing, settings)).toBeNull()
  })

  it('never throws on total network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    expect(await freeSearchGaps(extraction, missing, settings)).toBeNull()
  })
})
