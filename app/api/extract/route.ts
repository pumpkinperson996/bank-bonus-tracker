import { NextResponse } from 'next/server'
import { getSettings } from '@/lib/db'
import { fetchPageText } from '@/lib/fetch-page'
import { extractOffer, LlmError } from '@/lib/llm'
import { freeSearchGaps } from '@/lib/free-search'
import { runExtraction } from '@/lib/pipeline'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  let input: unknown
  try {
    ;({ input } = await req.json())
  } catch {
    return NextResponse.json({ error: 'bad_request', message: 'Invalid JSON body.' }, { status: 400 })
  }
  if (typeof input !== 'string' || !input.trim()) {
    return NextResponse.json({ error: 'bad_request', message: 'Body must be {input: string}.' }, { status: 400 })
  }

  const settings = getSettings()
  if (!settings.api_key) {
    return NextResponse.json(
      { error: 'no_api_key', message: 'Configure your LLM API key in Settings.' },
      { status: 400 }
    )
  }

  try {
    const result = await runExtraction(input, settings, {
      fetchPage: fetchPageText,
      extract: extractOffer,
      searchFree: freeSearchGaps,
    })
    return NextResponse.json(result)
  } catch (e) {
    if (e instanceof LlmError && e.kind === 'auth') {
      return NextResponse.json({ error: 'provider_auth' }, { status: 401 })
    }
    if (e instanceof LlmError && e.kind === 'validation') {
      return NextResponse.json({ error: 'extraction_invalid' }, { status: 502 })
    }
    return NextResponse.json({ error: 'extraction_failed' }, { status: 502 })
  }
}
