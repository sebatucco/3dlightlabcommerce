const rateLimitStore = new Map()

function cleanup() {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.windowStart + value.windowMs < now) {
      rateLimitStore.delete(key)
    }
  }
}

setInterval(cleanup, 60_000)

function getClientIp(req) {
  const forwarded = req.headers.get('x-forwarded-for') || ''
  const realIp = req.headers.get('x-real-ip') || ''
  const ip = (forwarded.split(',')[0] || realIp || 'unknown').trim()
  return ip || 'unknown'
}

function getUpstashConfig() {
  const url = String(process.env.UPSTASH_REDIS_REST_URL || '').trim()
  const token = String(process.env.UPSTASH_REDIS_REST_TOKEN || '').trim()
  if (!url || !token) return null
  return { url, token }
}

async function consumeUpstashWindow({ key, windowMs, max }) {
  const cfg = getUpstashConfig()
  if (!cfg) return null

  const ttlSeconds = Math.max(1, Math.ceil(windowMs / 1000))
  const pipeline = [
    ['INCR', key],
    ['EXPIRE', key, ttlSeconds, 'NX'],
    ['PTTL', key],
  ]

  const response = await fetch(`${cfg.url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(pipeline),
  })

  if (!response.ok) return null

  const data = await response.json().catch(() => null)
  if (!Array.isArray(data?.result) || data.result.length < 3) return null

  const count = Number(data.result?.[0]?.result || 0)
  const pttl = Number(data.result?.[2]?.result || 0)
  const now = Date.now()
  const resetAt = now + Math.max(0, pttl)

  if (count > max) {
    return {
      ok: false,
      status: 429,
      body: { error: 'Demasiadas peticiones. Intentá de nuevo más tarde.' },
      headers: {
        'Retry-After': String(Math.max(1, Math.ceil(Math.max(0, pttl) / 1000))),
        'X-RateLimit-Limit': String(max),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(resetAt),
      },
    }
  }

  return null
}

export function createRateLimiter({ windowMs = 60_000, max = 10 }) {
  return async function rateLimit(req) {
    const ip = getClientIp(req)
    const key = `rl:${ip}:${windowMs}:${max}`
    const now = Date.now()

    try {
      const distributedResult = await consumeUpstashWindow({ key, windowMs, max })
      if (distributedResult) return distributedResult
      if (getUpstashConfig()) return null
    } catch {
      // Fallback a memoria local
    }

    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, { count: 1, windowStart: now })
      return null
    }

    const record = rateLimitStore.get(key)

    if (now - record.windowStart > windowMs) {
      rateLimitStore.set(key, { count: 1, windowStart: now })
      return null
    }

    record.count++

    if (record.count > max) {
      return {
        ok: false,
        status: 429,
        body: { error: 'Demasiadas peticiones. Intentá de nuevo más tarde.' },
        headers: {
          'Retry-After': String(Math.ceil((record.windowStart + windowMs - now) / 1000)),
          'X-RateLimit-Limit': String(max),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(record.windowStart + windowMs),
        },
      }
    }

    return null
  }
}

export const rateLimits = {
  strict: createRateLimiter({ windowMs: 60_000, max: 5 }),
  orders: createRateLimiter({ windowMs: 60_000, max: 10 }),
  chat: createRateLimiter({ windowMs: 60_000, max: 10 }),
  contact: createRateLimiter({ windowMs: 60_000, max: 5 }),
  moderate: createRateLimiter({ windowMs: 60_000, max: 20 }),
  loose: createRateLimiter({ windowMs: 60_000, max: 60 }),
}
