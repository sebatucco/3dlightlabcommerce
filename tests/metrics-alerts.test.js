import { describe, it, expect } from 'vitest'
import { evaluateMetricsAlerts } from '@/lib/metrics-alerts'

describe('metrics alerts', () => {
  it('returns ok when there are no problematic routes', () => {
    const snapshot = {
      routes: [
        { route: '/api/a', method: 'GET', count: 100, errorRate: 0.5, avgDurationMs: 120 },
      ],
    }

    const result = evaluateMetricsAlerts(snapshot)
    expect(result.status).toBe('ok')
  })

  it('returns warn when error rate crosses warn threshold', () => {
    const snapshot = {
      routes: [
        { route: '/api/a', method: 'GET', count: 100, errorRate: 4, avgDurationMs: 120 },
      ],
    }

    const result = evaluateMetricsAlerts(snapshot)
    expect(result.status).toBe('warn')
    expect(result.warnRoutes.length).toBe(1)
  })

  it('returns critical when avg latency crosses critical threshold', () => {
    const snapshot = {
      routes: [
        { route: '/api/a', method: 'GET', count: 100, errorRate: 1, avgDurationMs: 1800 },
      ],
    }

    const result = evaluateMetricsAlerts(snapshot)
    expect(result.status).toBe('critical')
    expect(result.criticalRoutes.length).toBe(1)
  })
})
