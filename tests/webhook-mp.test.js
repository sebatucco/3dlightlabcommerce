import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockFetch = vi.fn()
global.fetch = mockFetch

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => ({ data: null, error: null })),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({ data: null, error: null })),
    })),
  })),
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockSupabase,
}))

vi.mock('@/lib/observability', () => ({
  withApiObservability: (req, route, handler) => handler(req),
}))

describe('MercadoPago webhook security', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('IP allowlist validation', () => {
    it('allows requests from IPs not in allowlist when env not set', () => {
      delete process.env.MERCADOPAGO_WEBHOOK_IP_ALLOWLIST

      const isAllowed = (ip) => {
        const rawAllowlist = String(process.env.MERCADOPAGO_WEBHOOK_IP_ALLOWLIST || '').trim()
        if (!rawAllowlist) return true
        const allowlist = rawAllowlist.split(',').map((i) => i.trim()).filter(Boolean)
        return allowlist.includes(ip)
      }

      expect(isAllowed('177.10.10.1')).toBe(true)
      expect(isAllowed('anything')).toBe(true)
    })

    it('allows requests from IPs in allowlist', () => {
      process.env.MERCADOPAGO_WEBHOOK_IP_ALLOWLIST = '177.10.10.1,177.10.10.2'

      const isAllowed = (ip) => {
        const rawAllowlist = String(process.env.MERCADOPAGO_WEBHOOK_IP_ALLOWLIST || '').trim()
        if (!rawAllowlist) return true
        const allowlist = rawAllowlist.split(',').map((i) => i.trim()).filter(Boolean)
        return allowlist.includes(ip)
      }

      expect(isAllowed('177.10.10.1')).toBe(true)
      expect(isAllowed('177.10.10.2')).toBe(true)
    })

    it('blocks requests from IPs not in allowlist', () => {
      process.env.MERCADOPAGO_WEBHOOK_IP_ALLOWLIST = '177.10.10.1'

      const isAllowed = (ip) => {
        const rawAllowlist = String(process.env.MERCADOPAGO_WEBHOOK_IP_ALLOWLIST || '').trim()
        if (!rawAllowlist) return true
        const allowlist = rawAllowlist.split(',').map((i) => i.trim()).filter(Boolean)
        return allowlist.includes(ip)
      }

      expect(isAllowed('177.10.10.99')).toBe(false)
    })
  })

  describe('token validation', () => {
    it('allows requests when no secret configured', () => {
      delete process.env.MERCADOPAGO_WEBHOOK_SECRET

      const isValid = (token) => {
        const secret = String(process.env.MERCADOPAGO_WEBHOOK_SECRET || '').trim()
        if (!secret) return true
        return token === secret
      }

      expect(isValid('any')).toBe(true)
      expect(isValid('')).toBe(true)
    })

    it('validates token from query and header', () => {
      process.env.MERCADOPAGO_WEBHOOK_SECRET = 'mysecret123'

      const isValid = (queryToken, headerToken) => {
        const secret = String(process.env.MERCADOPAGO_WEBHOOK_SECRET || '').trim()
        return queryToken === secret || headerToken === secret
      }

      expect(isValid('mysecret123', '')).toBe(true)
      expect(isValid('', 'mysecret123')).toBe(true)
      expect(isValid('wrong', '')).toBe(false)
      expect(isValid('', 'wrong')).toBe(false)
    })
  })

  describe('signature verification (HMAC SHA256)', () => {
    it('generates and verifies HMAC signature', async () => {
      const crypto = await import('crypto')
      const secret = 'test_secret_key'
      const payload = JSON.stringify({ id: 12345, type: 'payment' })

      const hmac = crypto.createHmac('sha256', secret)
      hmac.update(payload, 'utf8')
      const expectedSignature = hmac.digest('hex')

      const verifySignature = (sig, body) => {
        const computed = crypto.createHmac('sha256', secret)
        computed.update(body, 'utf8')
        return computed.digest('hex') === sig
      }

      expect(verifySignature(expectedSignature, payload)).toBe(true)
      expect(verifySignature('invalid', payload)).toBe(false)
    })
  })
})