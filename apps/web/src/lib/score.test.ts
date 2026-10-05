import { describe, expect, it } from 'vitest'
import { bestOf, entryScore, scoringDone, standings, type ScoredEntry } from './score'

// Données d'exemple du prototype (concours-photo.html) : 4 participants, 5 défis, 3 jurés.
const sc = (respect: number, quality: number, originality: number) => ({ respect, quality, originality })
let t = 0
const e = (
  id: string,
  participantId: string,
  challengeId: string,
  status: ScoredEntry['status'],
  scores: ScoredEntry['scores'] = {},
): ScoredEntry => ({ id, participantId, challengeId, status, scores, validatedAt: ++t })

const entries: ScoredEntry[] = [
  e('e1', 'p1', 'c1', 'ok', { j1: sc(9, 8, 7), j2: sc(8, 8, 8) }),
  e('e2', 'p1', 'c2', 'ok', { j1: sc(10, 9, 9), j2: sc(9, 9, 10), j3: sc(9, 8, 9) }),
  e('e3', 'p1', 'c3', 'pending'),
  e('e4', 'p2', 'c1', 'ok', { j1: sc(7, 6, 6), j3: sc(8, 7, 6) }),
  e('e5', 'p2', 'c4', 'ok', { j1: sc(9, 7, 8), j2: sc(8, 7, 7) }),
  e('e6', 'p2', 'c5', 'ok', { j2: sc(8, 6, 7) }),
  e('e7', 'p2', 'c3', 'rejected'),
  e('e8', 'p3', 'c2', 'ok', { j1: sc(8, 9, 8), j3: sc(9, 9, 7) }),
  e('e9', 'p3', 'c3', 'ok', { j1: sc(10, 8, 9), j2: sc(9, 9, 9) }),
  e('e10', 'p3', 'c1', 'ok', { j2: sc(6, 7, 5) }),
  e('e11', 'p3', 'c4', 'pending'),
  e('e12', 'p3', 'c5', 'ok', { j1: sc(9, 8, 8) }),
  e('e13', 'p4', 'c3', 'pending'),
  e('e14', 'p4', 'c1', 'ok'),
]

describe('entryScore', () => {
  it('moyenne des 3 critères puis des jurés', () => {
    expect(entryScore(entries[0])).toBeCloseTo(8, 5)
    expect(entryScore(entries[1])).toBeCloseTo(9.1111, 4)
  })
  it('est null sans aucune note', () => {
    expect(entryScore(entries[13])).toBeNull()
  })
})

describe('standings', () => {
  const rows = standings(['p1', 'p2', 'p3', 'p4'], entries, 5, 3)

  it('classe les participants par score', () => {
    expect(rows.map((r) => r.participantId)).toEqual(['p3', 'p1', 'p2', 'p4'])
  })
  it('calcule 30 % participation + 70 % jury, arrondi à 2 décimales', () => {
    expect(rows.map((r) => r.score)).toEqual([79.42, 71.89, 67.78, 6])
  })
  it('compte un défi validé même sans note', () => {
    const p4 = rows.find((r) => r.participantId === 'p4')!
    expect(p4.done).toBe(1)
    expect(p4.jury).toBe(0)
  })
  it('compte les notes manquantes', () => {
    expect(rows.find((r) => r.participantId === 'p3')!.missing).toBe(4)
  })
  it('départage une égalité par la meilleure note individuelle', () => {
    const a = [e('a1', 'x', 'c1', 'ok', { j1: sc(10, 10, 10) }), e('a2', 'x', 'c2', 'ok', { j1: sc(4, 4, 4) })]
    const b = [e('b1', 'y', 'c1', 'ok', { j1: sc(7, 7, 7) }), e('b2', 'y', 'c2', 'ok', { j1: sc(7, 7, 7) })]
    const r = standings(['y', 'x'], [...a, ...b], 2, 1)
    expect(r[0].score).toBe(r[1].score)
    expect(r.map((x) => x.participantId)).toEqual(['x', 'y'])
  })
})

describe('bestOf', () => {
  it('choisit la meilleure note du défi', () => {
    const c1 = entries.filter((x) => x.challengeId === 'c1' && x.status === 'ok')
    expect(bestOf(c1)!.id).toBe('e1')
  })
  it('à égalité, privilégie le plus de jurés puis le plus ancien', () => {
    const a = e('a', 'p', 'c', 'ok', { j1: sc(8, 8, 8) })
    const b = e('b', 'q', 'c', 'ok', { j1: sc(8, 8, 8), j2: sc(8, 8, 8) })
    const c = e('c', 'r', 'c', 'ok', { j1: sc(8, 8, 8), j2: sc(8, 8, 8) })
    expect(bestOf([a, c, b])!.id).toBe('b')
  })
})

describe('scoringDone', () => {
  it('est faux tant qu\'un envoi est en attente ou pas noté par tous', () => {
    expect(scoringDone(entries, 3)).toBe(false)
  })
  it('est vrai quand tout est modéré et noté par tous', () => {
    const done = [e('z', 'p', 'c', 'ok', { j1: sc(8, 8, 8), j2: sc(8, 8, 8), j3: sc(8, 8, 8) })]
    expect(scoringDone(done, 3)).toBe(true)
  })
})
