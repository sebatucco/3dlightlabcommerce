import { describe, it, expect } from 'vitest'

function normalizeString(value, maxLength = 255) {
  return String(value || '').trim().slice(0, maxLength)
}

function normalizeEmail(value) {
  return normalizeString(value, 180).toLowerCase()
}

function isValidEmail(email) {
  if (!email) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

describe('email validation', () => {
  it('accepts valid emails', () => {
    expect(isValidEmail('test@example.com')).toBe(true)
    expect(isValidEmail('user.name@domain.org')).toBe(true)
    expect(isValidEmail('a@b.co')).toBe(true)
  })

  it('rejects invalid emails', () => {
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail('notanemail')).toBe(false)
    expect(isValidEmail('@domain.com')).toBe(false)
    expect(isValidEmail('user@')).toBe(false)
    expect(isValidEmail('user @domain.com')).toBe(false)
  })

  it('normalizes email to lowercase', () => {
    expect(normalizeEmail('USER@Example.COM')).toBe('user@example.com')
  })
})

describe('string normalization', () => {
  it('trims whitespace', () => {
    expect(normalizeString('  hello  ')).toBe('hello')
  })

  it('handles empty/null/undefined', () => {
    expect(normalizeString('')).toBe('')
    expect(normalizeString(null)).toBe('')
    expect(normalizeString(undefined)).toBe('')
  })

  it('respects max length', () => {
    expect(normalizeString('abcdefghij', 5)).toBe('abcde')
  })
})
