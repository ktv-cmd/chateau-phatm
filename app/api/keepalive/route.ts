import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { logger } from '@/lib/logger'

/**
 * GET /api/keepalive
 *
 * Pings Supabase once a day to prevent the free-tier project from pausing
 * due to 7 days of inactivity.
 *
 * Protected by CRON_SECRET — Vercel cron jobs automatically send:
 *   Authorization: Bearer <CRON_SECRET>
 *
 * To call manually: GET /api/keepalive
 *   with header  Authorization: Bearer <your CRON_SECRET>
 *   or omit the header if CRON_SECRET is not set (local dev only).
 */
export async function GET(req: NextRequest) {
  // ---------- auth guard ----------
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // ---------- ping Supabase ----------
  try {
    const supabase = createServerClient()

    const { error } = await supabase
      .from('products')
      .select('id')
      .limit(1)

    if (error) {
      // Always surface DB errors regardless of environment
      console.error('[keepalive] Supabase query error:', error.message, {
        code: error.code,
        hint: error.hint,
      })
      return NextResponse.json(
        { status: 'error', message: error.message },
        { status: 500 }
      )
    }

    logger.info('[keepalive] Supabase ping successful at', new Date().toISOString())
    return NextResponse.json({ status: 'Supabase active' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[keepalive] Unexpected error:', message)
    return NextResponse.json(
      { status: 'error', message },
      { status: 500 }
    )
  }
}
