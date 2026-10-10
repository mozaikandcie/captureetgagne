import { describe, expect, it } from 'vitest'
import { formatPrize, formatRemaining } from './format'

const H = 3600_000
describe('formatRemaining', () => {
  it('compte en jours et heures au-delà de 24 h', () => {
    expect(formatRemaining(70 * 24 * H + 4 * H)).toBe('70 j 04 h')
    expect(formatRemaining(24 * H)).toBe('1 j 00 h')
  })
  it('compte en heures et minutes sous 24 h', () => {
    expect(formatRemaining(5 * H + 7 * 60_000)).toBe('5 h 07 min')
  })
  it('compte en minutes et secondes sous une heure', () => {
    expect(formatRemaining(8 * 60_000 + 3000)).toBe('8 min 03 s')
    expect(formatRemaining(0)).toBe('0 min 00 s')
  })
  it('ne devient jamais négatif', () => {
    expect(formatRemaining(-5000)).toBe('0 min 00 s')
  })
})

describe('formatPrize', () => {
  it('met en forme une somme seule', () => {
    expect(formatPrize('50')).toBe('50 €')
    expect(formatPrize('50€')).toBe('50 €')
    expect(formatPrize(' 50 euros ')).toBe('50 €')
    expect(formatPrize('12.5')).toBe('12,5 €')
  })
  it('laisse un texte libre tel quel', () => {
    expect(formatPrize('1er prix : 2 places de concert')).toBe('1er prix : 2 places de concert')
    expect(formatPrize('Panier garni de 50 €')).toBe('Panier garni de 50 €')
  })
})
