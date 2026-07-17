import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getProviderSettings, saveProviderSettings } from '@/lib/db'

export const runtime = 'nodejs'

const ProviderSettingsSchema = z.object({
  providers: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        base_url: z.string(),
        api_key: z.string(),
        model: z.string(),
      })
    )
    .min(1),
  active_provider: z.string(),
})

export async function GET() {
  return NextResponse.json(getProviderSettings())
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = ProviderSettingsSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'invalid settings' }, { status: 400 })
  saveProviderSettings(parsed.data)
  return NextResponse.json(getProviderSettings())
}
