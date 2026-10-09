import { describe, expect, it } from 'vitest'
import { isProvisional, missingByJuror, rankOf } from './status'

describe('isProvisional', () => {
  it('est définitif sans envoi en attente ni note manquante', () => {
    expect(isProvisional([{ missing: 0 }, { missing: 0 }], 0)).toBe(false)
  })
  it('est provisoire avec un envoi à modérer', () => {
    expect(isProvisional([{ missing: 0 }], 1)).toBe(true)
  })
  it('est provisoire avec une note manquante', () => {
    expect(isProvisional([{ missing: 0 }, { missing: 2 }], 0)).toBe(true)
  })
})

describe('rankOf', () => {
  const rows = [
    { participantId: 'a', score: 90 },
    { participantId: 'b', score: 80 },
    { participantId: 'c', score: 80 },
    { participantId: 'd', score: 10 },
  ]
  it('donne le rang dans l’ordre du classement', () => {
    expect(rankOf(rows, 'a')).toBe(1)
    expect(rankOf(rows, 'd')).toBe(4)
  })
  it('partage le rang en cas de score identique', () => {
    expect(rankOf(rows, 'c')).toBe(2)
  })
  it('renvoie null pour un inconnu', () => {
    expect(rankOf(rows, 'z')).toBeNull()
  })
})

describe('missingByJuror', () => {
  it('compte les envois validés non notés par chaque juré', () => {
    const scores = [
      { entryId: 'e1', jurorId: 'j1' },
      { entryId: 'e2', jurorId: 'j1' },
      { entryId: 'e1', jurorId: 'j2' },
    ]
    const res = missingByJuror(['e1', 'e2', 'e3'], scores, [
      { id: 'j1', label: 'Présidente' },
      { id: 'j2', label: 'Trésorier' },
      { id: 'j3', label: 'Bénévole' },
    ])
    expect(res.map((r) => r.missing)).toEqual([1, 2, 3])
  })
})
