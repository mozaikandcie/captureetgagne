import { describe, expect, it } from 'vitest'
import { nextScale, nextTheme } from './prefs'

describe('nextScale', () => {
  it('boucle sur 100 %, 115 %, 130 %', () => {
    expect(nextScale(1)).toBe(1.15)
    expect(nextScale(1.15)).toBe(1.3)
    expect(nextScale(1.3)).toBe(1)
  })
  it('repart de 100 % pour une valeur inconnue', () => {
    expect(nextScale(2)).toBe(1)
  })
})

describe('nextTheme', () => {
  it('boucle automatique → clair → sombre', () => {
    expect(nextTheme('auto')).toBe('light')
    expect(nextTheme('light')).toBe('dark')
    expect(nextTheme('dark')).toBe('auto')
  })
})
