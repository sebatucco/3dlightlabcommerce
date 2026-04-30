import { persistApiMetricSample } from '@/lib/metrics-persistence'

const MAX_SAMPLES = 500

const metricsStore = {
  totalRequests: 0,
  byRoute: new Map(),
  recent: [],
}

function keyOf(route, method) {
  return `${method} ${route}`
}

export function observeApiMetric({ route, method, status, durationMs, requestId = null }) {
  metricsStore.totalRequests += 1

  const key = keyOf(route, method)
  const existing = metricsStore.byRoute.get(key) || {
    route,
    method,
    count: 0,
    errorCount: 0,
    totalDurationMs: 0,
    maxDurationMs: 0,
    lastStatus: 200,
    lastSeenAt: null,
  }

  existing.count += 1
  if (status >= 400) existing.errorCount += 1
  existing.totalDurationMs += durationMs
  existing.maxDurationMs = Math.max(existing.maxDurationMs, durationMs)
  existing.lastStatus = status
  existing.lastSeenAt = new Date().toISOString()

  metricsStore.byRoute.set(key, existing)

  metricsStore.recent.push({
    route,
    method,
    status,
    durationMs,
    requestId,
    ts: new Date().toISOString(),
  })

  if (metricsStore.recent.length > MAX_SAMPLES) {
    metricsStore.recent = metricsStore.recent.slice(metricsStore.recent.length - MAX_SAMPLES)
  }

  void persistApiMetricSample({ route, method, status, durationMs, requestId })
}

export function getApiMetricsSnapshot() {
  const routes = Array.from(metricsStore.byRoute.values()).map((item) => ({
    ...item,
    avgDurationMs: item.count > 0 ? Number((item.totalDurationMs / item.count).toFixed(2)) : 0,
    errorRate: item.count > 0 ? Number(((item.errorCount / item.count) * 100).toFixed(2)) : 0,
  }))

  routes.sort((a, b) => b.count - a.count)

  return {
    totalRequests: metricsStore.totalRequests,
    routeCount: routes.length,
    routes,
    recent: metricsStore.recent,
    generatedAt: new Date().toISOString(),
  }
}
