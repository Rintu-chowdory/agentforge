import { NextResponse } from 'next/server'
import { verifyTarget } from '@/lib/verify'

// node:tls is used to inspect the certificate, so this must not run on the edge runtime.
export const runtime = 'nodejs'
export const maxDuration = 30

// Best-effort per-instance throttle. It is not a security control, it just keeps one
// browser from turning the endpoint into a port scanner.
const hits = new Map<string, number[]>()
const WINDOW_MS = 60_000
const LIMIT = 12

function throttled(key: string): boolean {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((at) => now - at < WINDOW_MS)
  recent.push(now)
  hits.set(key, recent)
  if (hits.size > 500) hits.clear()
  return recent.length > LIMIT
}

export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  if (throttled(ip)) {
    return NextResponse.json(
      { error: 'Too many checks in a minute. Wait a moment and try again.' },
      { status: 429 },
    )
  }

  let body: { target?: unknown } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body with a target.' }, { status: 400 })
  }

  const target = typeof body.target === 'string' ? body.target.trim() : ''
  if (!target) {
    return NextResponse.json({ error: 'Enter something to check.' }, { status: 400 })
  }
  if (target.length > 500) {
    return NextResponse.json({ error: 'That value is too long to check.' }, { status: 400 })
  }

  try {
    const result = await verifyTarget(target)
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'The check itself failed.',
        detail: error instanceof Error ? error.message : 'unknown error',
      },
      { status: 500 },
    )
  }
}
