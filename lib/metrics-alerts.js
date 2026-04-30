function toNumber(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export function getAlertThresholds() {
  return {
    minSamples: toNumber(process.env.ALERT_MIN_SAMPLES, 30),
    warnErrorRate: toNumber(process.env.ALERT_WARN_ERROR_RATE, 3),
    criticalErrorRate: toNumber(process.env.ALERT_CRITICAL_ERROR_RATE, 8),
    warnAvgLatencyMs: toNumber(process.env.ALERT_WARN_AVG_LATENCY_MS, 700),
    criticalAvgLatencyMs: toNumber(process.env.ALERT_CRITICAL_AVG_LATENCY_MS, 1500),
  }
}

function routeSeverity(route, thresholds) {
  if ((route?.count || 0) < thresholds.minSamples) return null

  const errorRate = Number(route?.errorRate || 0)
  const avgLatency = Number(route?.avgDurationMs || 0)

  if (errorRate >= thresholds.criticalErrorRate || avgLatency >= thresholds.criticalAvgLatencyMs) {
    return 'critical'
  }

  if (errorRate >= thresholds.warnErrorRate || avgLatency >= thresholds.warnAvgLatencyMs) {
    return 'warn'
  }

  return null
}

export function evaluateMetricsAlerts(snapshot, source = 'memory') {
  const thresholds = getAlertThresholds()
  const routes = Array.isArray(snapshot?.routes) ? snapshot.routes : []

  const criticalRoutes = []
  const warnRoutes = []

  for (const route of routes) {
    const sev = routeSeverity(route, thresholds)
    if (sev === 'critical') criticalRoutes.push(route)
    if (sev === 'warn') warnRoutes.push(route)
  }

  const status = criticalRoutes.length > 0 ? 'critical' : warnRoutes.length > 0 ? 'warn' : 'ok'

  return {
    source,
    status,
    thresholds,
    criticalRoutes,
    warnRoutes,
    checkedAt: new Date().toISOString(),
  }
}
