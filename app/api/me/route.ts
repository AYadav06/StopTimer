import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSessionToken } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const token = await getSessionToken()
  if (!token) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }
  return NextResponse.json({ email: token })
}
