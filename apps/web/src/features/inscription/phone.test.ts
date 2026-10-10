import { describe, expect, it } from 'vitest'
import { normalizePhone } from './phone'

describe('normalizePhone', () => {
  it('convertit un numéro national', () => {
    expect(normalizePhone('06 12 34 56 78')).toBe('+33612345678')
    expect(normalizePhone('06.12.34.56.78')).toBe('+33612345678')
  })
  it('donne l’indicatif d’outre-mer aux mobiles ultramarins', () => {
    expect(normalizePhone('06 90 12 34 56')).toBe('+590690123456')
    expect(normalizePhone('0694 12 34 56')).toBe('+594694123456')
    expect(normalizePhone('06 96 12 34 56')).toBe('+596696123456')
    expect(normalizePhone('0692123456')).toBe('+262692123456')
  })
  it('garde +33 pour les mobiles de métropole', () => {
    expect(normalizePhone('06 12 34 56 78')).toBe('+33612345678')
    expect(normalizePhone('07 12 34 56 78')).toBe('+33712345678')
  })
  it('garde un numéro international', () => {
    expect(normalizePhone('+590 690 12 34 56')).toBe('+590690123456')
    expect(normalizePhone('0033612345678')).toBe('+33612345678')
  })
  it('refuse les téléphones fixes et les numéros spéciaux (ils ne reçoivent pas de SMS)', () => {
    for (const n of ['01 23 45 67 89', '04 91 00 00 00', '05 56 00 00 00', '09 72 00 00 00', '08 05 00 00 00']) expect(normalizePhone(n), n).toBeNull()
  })
  it('accepte les mobiles 06 et 07', () => {
    expect(normalizePhone('07 00 00 00 01')).toBe('+33700000001')
    expect(normalizePhone('06 00 00 00 01')).toBe('+33600000001')
  })
  it('refuse les numéros invalides', () => {
    expect(normalizePhone('')).toBeNull()
    expect(normalizePhone('12345')).toBeNull()
    expect(normalizePhone('06 12 34')).toBeNull()
    expect(normalizePhone('+0612345678')).toBeNull()
  })
})
