import { createAdminSupabaseClient } from '@/lib/admin-supabase'

function persistenceEnabled() {
  return String(process.env.METRICS_PERSISTENCE_ENABLED || 'true').toLowerCase() !== 'false'
}

function getClient() {
  if (!persistenceEnabled()) return null

  try {
    return createAdminSupabaseClient()
  } catch {
    return null
  }
}

export async function persistApiMetricSample(sample) {
  const client = getClient()
  if (!client) return false

  const payload = {
    route: String(sample.route || ''),
    method: String(sample.method || 'GET'),
    status: Number(sample.status || 200),
    duration_ms: Number(sample.durationMs || 0),
    request_id: sample.requestId ? String(sample.requestId) : null,
  }

  const { error } = await client.from('api_request_metrics').insert(payload)
  return !error
}

export async function getPersistedApiMetricsSnapshot({ hours = 24, limit = 1000 } = {}) {
  const client = getClient()
  if (!client) {
    return {
      enabled: false,
      totalRequests: 0,
      routes: [],
      recent: [],
      generatedAt: new Date().toISOString(),
    }
  }

  const since = new Date(Date.now() - Math.max(1, Number(hours || 24)) * 60 * 60 * 1000).toISOString()

  const { data, error } = await client
    .from('api_request_metrics')
    .select('route,method,status,duration_ms,created_at,request_id')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(Math.max(1, Number(limit || 1000)))

  if (error || !Array.isArray(data)) {
    return {
      enabled: true,
      error: error?.message || 'No se pudo leer métricas persistidas',
      totalRequests: 0,
      routes: [],
      recent: [],
      generatedAt: new Date().toISOString(),
    }
  }

  const byRoute = new Map()

  for (const row of data) {
    const method = String(row.method || 'GET')
    const route = String(row.route || 'unknown')
    const status = Number(row.status || 200)
    const durationMs = Number(row.duration_ms || 0)
    const key = `${method} ${route}`

    const current = byRoute.get(key) || {
      method,
      route,
      count: 0,
      errorCount: 0,
      totalDurationMs: 0,
      maxDurationMs: 0,
      lastStatus: 200,
      lastSeenAt: null,
    }

    current.count += 1
    if (status >= 400) current.errorCount += 1
    current.totalDurationMs += durationMs
    current.maxDurationMs = Math.max(current.maxDurationMs, durationMs)
    current.lastStatus = status
    current.lastSeenAt = row.created_at || current.lastSeenAt

    byRoute.set(key, current)
  }

  const routes = Array.from(byRoute.values())
    .map((item) => ({
      ...item,
      avgDurationMs: item.count > 0 ? Number((item.totalDurationMs / item.count).toFixed(2)) : 0,
      errorRate: item.count > 0 ? Number(((item.errorCount / item.count) * 100).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.count - a.count)

  return {
    enabled: true,
    totalRequests: data.length,
    routes,
    recent: data.slice(0, 100).map((row) => ({
      route: row.route,
      method: row.method,
      status: row.status,
      durationMs: row.duration_ms,
      ts: row.created_at,
      requestId: row.request_id || null,
    })),
    generatedAt: new Date().toISOString(),
  }
}
