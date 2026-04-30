import { NextResponse } from 'next/server'
import { observeApiMetric } from '@/lib/metrics-store'

function nowMs() {
  if (typeof process !== 'undefined' && process.hrtime?.bigint) {
    return Number(process.hrtime.bigint() / 1000000n)
  }
  return Math.round(performance.now())
}

export function getRequestId(request) {
  return (
    request.headers.get('x-request-id') ||
    request.headers.get('x-correlation-id') ||
    `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  )
}

export function logInfo(event, payload = {}) {
  console.log(
    JSON.stringify({
      level: 'info',
      event,
      ts: new Date().toISOString(),
      ...payload,
    })
  )
}

export function logError(event, payload = {}) {
  console.error(
    JSON.stringify({
      level: 'error',
      event,
      ts: new Date().toISOString(),
      ...payload,
    })
  )
}

export function withRequestId(response, requestId) {
  response.headers.set('x-request-id', requestId)
  return response
}

export async function withApiObservability(request, route, handler) {
  const requestId = getRequestId(request)
  const method = request.method || 'GET'
  const startedAt = nowMs()

  logInfo('api.request.start', {
    requestId,
    route,
    method,
  })

  try {
    const response = await handler({ requestId })
    const durationMs = Math.max(0, nowMs() - startedAt)
    const status = response?.status || 200

    observeApiMetric({ route, method, status, durationMs, requestId })

    logInfo('api.request.end', {
      requestId,
      route,
      method,
      status,
      durationMs,
    })

    if (response instanceof NextResponse || response instanceof Response) {
      return withRequestId(response, requestId)
    }

    const fallback = NextResponse.json(response || { ok: true })
    return withRequestId(fallback, requestId)
  } catch (error) {
    const durationMs = Math.max(0, nowMs() - startedAt)

    observeApiMetric({ route, method, status: 500, durationMs, requestId })

    logError('api.request.error', {
      requestId,
      route,
      method,
      durationMs,
      error: error?.message || 'Unknown error',
    })

    return withRequestId(
      NextResponse.json(
        {
          error: 'Error interno',
          requestId,
        },
        { status: 500 }
      ),
      requestId
    )
  }
}
