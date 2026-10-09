import { describe, expect, it } from 'vitest'
import { buildSteps, type CeremonyEntry } from './steps'

const j = (r: number, q: number, o: number) => ({ respect: r, quality: q, originality: o })
const e = (id: string, p: string, c: string, scores: CeremonyEntry['scores'], t = 1): CeremonyEntry => ({
  id, participantId: p, challengeId: c, status: 'ok', validatedAt: t, scores, kind: 'photo', url: null,
})

describe('buildSteps', () => {
  const entries = [
    e('e1', 'p1', 'c1', { j1: j(9, 8, 7), j2: j(8, 8, 8) }),
    e('e2', 'p2', 'c1', { j1: j(7, 6, 6), j2: j(8, 7, 6) }),
    e('e3', 'p2', 'c2', { j1: j(10, 9, 9), j2: j(9, 9, 10) }),
    e('e4', 'p3', 'c2', { j1: j(5, 5, 5), j2: j(5, 5, 5) }),
  ]
  const steps = buildSteps(['c1', 'c2', 'c3'], ['p1', 'p2', 'p3', 'p4'], entries, 2)

  it('ouvre par l’intro et finit par la clôture', () => {
    expect(steps[0].type).toBe('intro')
    expect(steps.at(-1)?.type).toBe('end')
  })

  it('donne un prix par défi qui a un envoi noté', () => {
    const prizes = steps.filter((s) => s.type === 'prize')
    expect(prizes.map((s) => s.type === 'prize' && [s.challengeId, s.entry.id])).toEqual([
      ['c1', 'e1'],
      ['c2', 'e3'],
    ])
  })

  it('annonce le podium de la 3e à la 1re place, sans les participants sans défi validé', () => {
    const podium = steps.filter((s) => s.type === 'podium')
    expect(podium.map((s) => s.type === 'podium' && [s.rank, s.row.participantId])).toEqual([
      [3, 'p3'],
      [2, 'p1'],
      [1, 'p2'],
    ])
  })

  it('n’annonce pas de place vide quand il y a moins de 3 classés', () => {
    const few = buildSteps(['c1'], ['p1'], [entries[0]], 2)
    expect(few.filter((s) => s.type === 'podium')).toHaveLength(1)
  })
})
