import { describe, expect, it } from 'vitest'
import { average, clampNote, toScore } from './notes'

describe('clampNote', () => {
  it('borne entre 0 et 10 et arrondit', () => {
    expect(clampNote(11)).toBe(10)
    expect(clampNote(-2)).toBe(0)
    expect(clampNote(6.6)).toBe(7)
    expect(clampNote(NaN)).toBe(0)
  })
})

describe('average', () => {
  it('fait la moyenne des 3 critères', () => {
    expect(average({ respect: 9, quality: 8, originality: 7 })).toBe(8)
  })
})

describe('toScore', () => {
  const entries = [
    { id: 'b', createdAt: '2026-12-19T21:00:00Z', status: 'ok' },
    { id: 'a', createdAt: '2026-12-19T20:00:00Z', status: 'ok' },
    { id: 'c', createdAt: '2026-12-19T19:00:00Z', status: 'pending' },
    { id: 'd', createdAt: '2026-12-19T18:00:00Z', status: 'ok' },
  ]
  it('ne garde que les envois validés pas encore notés, du plus ancien au plus récent', () => {
    expect(toScore(entries, new Set(['d'])).map((e) => e.id)).toEqual(['a', 'b'])
  })
})
