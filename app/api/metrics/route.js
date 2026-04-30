import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getApiMetricsSnapshot } from '@/lib/metrics-store'
import { getPersistedApiMetricsSnapshot } from '@/lib/metrics-persistence'
import { evaluateMetricsAlerts } from '@/lib/metrics-alerts'
import { sendAlertWebhook } from '@/lib/alert-notifier'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  const inMemory = getApiMetricsSnapshot()
  const persisted = await getPersistedApiMetricsSnapshot({ hours: 24, limit: 5000 })
  const alerts = {
    memory: evaluateMetricsAlerts(inMemory, 'memory'),
    persisted: evaluateMetricsAlerts(persisted, 'persisted_24h'),
  }

  if (alerts.persisted.status === 'critical') {
    const top = alerts.persisted.criticalRoutes
      .slice(0, 3)
      .map((r) => `${r.method} ${r.route} (err ${r.errorRate}%, avg ${r.avgDurationMs}ms)`)
      .join(' | ')

    await sendAlertWebhook({
      key: `metrics-critical-${new Date().toISOString().slice(0, 13)}`,
      title: 'ALERTA CRITICA API 3DLightLab',
      payload: {
        severity: 'critical',
        source: 'persisted_24h',
        topRoutes: top,
      },
    })
  }

  return NextResponse.json(
    {
      ...inMemory,
      persisted,
      alerts,
    },
    {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
    }
  )
}
