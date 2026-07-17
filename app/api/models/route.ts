import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Server-side proxy: browsers can't call provider APIs directly (CORS).
// Success doubles as the connectivity test; payload feeds the model dropdown.
export async function POST(req: Request) {
  let base_url: unknown, api_key: unknown
  try {
    ;({ base_url, api_key } = await req.json())
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }
  if (typeof base_url !== 'string' || !base_url.trim()) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }
  try {
    const res = await fetch(`${base_url.replace(/\/+$/, '')}/models`, {
      headers: { Authorization: `Bearer ${typeof api_key === 'string' ? api_key : ''}` },
      signal: AbortSignal.timeout(20_000),
    })
    if (!res.ok) {
      return NextResponse.json({ error: `HTTP ${res.status}` }, { status: 502 })
    }
    const data = (await res.json()) as { data?: { id?: unknown }[] }
    const models = (data?.data ?? [])
      .map((m) => m?.id)
      .filter((x): x is string => typeof x === 'string')
    return NextResponse.json({ models })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'request failed' },
      { status: 502 }
    )
  }
}
