import { NextResponse } from 'next/server'
import { deleteDdEvent } from '@/lib/db'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function DELETE(_req: Request, { params }: Ctx) {
  const id = Number((await params).id)
  if (!deleteDdEvent(id)) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
