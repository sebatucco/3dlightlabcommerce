import { describe, it, expect } from 'vitest'
import { createRateLimiter, rateLimits } from '../lib/rate-limiter'

describe('rate-limiter', () => {
  it('allows requests within limit', async () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 5 })
    const req = { headers: { get: () => '127.0.0.1' } }

    for (let i = 0; i < 5; i++) {
      const result = await limiter(req)
      expect(result).toBeNull()
    }
  })

  it('blocks requests over limit', async () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 3 })
    const req = { headers: { get: () => '127.0.0.2' } }

    for (let i = 0; i < 3; i++) {
      await limiter(req)
    }

    const result = await limiter(req)
    expect(result).not.toBeNull()
    expect(result.status).toBe(429)
    expect(result.body.error).toContain('Demasiadas peticiones')
  })

  it('tracks different IPs separately', async () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 })
    const req1 = { headers: { get: () => '10.0.0.1' } }
    const req2 = { headers: { get: () => '10.0.0.2' } }

    await limiter(req1)
    const result1 = await limiter(req1)
    expect(result1).not.toBeNull()

    const result2 = await limiter(req2)
    expect(result2).toBeNull()
  })

  it('uses x-forwarded-for header', async () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 })
    const req = { headers: { get: (h) => h === 'x-forwarded-for' ? '203.0.113.1' : null } }

    await limiter(req)
    const result = await limiter(req)
    expect(result).not.toBeNull()
  })
})
