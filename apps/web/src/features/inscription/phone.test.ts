import { describe, expect, it } from 'vitest'
import { normalizePhone } from './phone'

describe('normalizePhone', () => {
  it('convertit un numéro national', () => {
    expect(normalizePhone('06 12 34 56 78')).toBe('+33612345678')
    expect(normalizePhone('06.12.34.56.78')).toBe('+33612345678')
  })
  it('garde un numéro international', () => {
    expect(normalizePhone('+590 690 12 34 56')).toBe('+590690123456')
    expect(normalizePhone('0033612345678')).toBe('+33612345678')
  })
  it('refuse les numéros invalides', () => {
    expect(normalizePhone('')).toBeNull()
    expect(normalizePhone('12345')).toBeNull()
    expect(normalizePhone('06 12 34')).toBeNull()
    expect(normalizePhone('+0612345678')).toBeNull()
  })
})
