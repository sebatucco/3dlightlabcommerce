import { NextResponse } from 'next/server'
import { withApiObservability } from '@/lib/observability'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  return withApiObservability(request, '/api/health', async () =>
    NextResponse.json(
      {
        ok: true,
        service: '3dlightlab-commerce',
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    )
  )
}
