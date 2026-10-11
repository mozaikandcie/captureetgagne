import { describe, expect, it } from 'vitest'
import { buildMessage, firstName, groupAwards, maskPhone } from '../../../../supabase/functions/_shared/winners'

describe('groupAwards', () => {
  it('regroupe tous les prix d’une même personne en un seul SMS', () => {
    const awards = groupAwards({
      podium: [{ participantId: 'a', rank: 2 }, { participantId: 'b', rank: 1 }],
      challengePrizes: [{ participantId: 'b', title: 'Plan large' }, { participantId: 'c', title: 'Madras' }, { participantId: 'b', title: 'Danse' }],
      publicWinnerId: 'a',
    })
    expect(awards.map((a) => a.participantId)).toEqual(['b', 'a', 'c'])
    expect(awards[0]).toMatchObject({ rank: 1, challenges: ['Plan large', 'Danse'], publicPrize: false })
    expect(awards[1]).toMatchObject({ rank: 2, publicPrize: true })
    expect(awards[2]).toMatchObject({ rank: null, challenges: ['Madras'] })
  })
  it('ne duplique pas un défi', () => {
    const [a] = groupAwards({ podium: [], challengePrizes: [{ participantId: 'a', title: 'X' }, { participantId: 'a', title: 'X' }] })
    expect(a.challenges).toEqual(['X'])
  })
  it('sans gagnant, aucun SMS', () => {
    expect(groupAwards({ podium: [], challengePrizes: [], publicWinnerId: null })).toEqual([])
  })
})

describe('buildMessage', () => {
  it('1re place', () => {
    expect(buildMessage('Alex Dupont', { participantId: 'a', rank: 1, challenges: [], publicPrize: false }))
      .toBe("Capture et Gagne : bravo Alex ! Tu remportes la 1re place du concours. Passe voir l'équipe Ambyans pour récupérer ton lot.")
  })
  it('cumule place, Prix du public et deux défis', () => {
    const m = buildMessage('Paul', { participantId: 'a', rank: 3, challenges: ['Madras', 'Danse'], publicPrize: true })
    expect(m).toContain('la 3e place du concours, le Prix du public et les prix des défis « Madras » et « Danse »')
  })
  it('un seul défi au singulier', () => {
    expect(buildMessage('Léa', { participantId: 'a', rank: null, challenges: ['Madras'], publicPrize: false })).toContain('le prix du défi « Madras »')
  })
  it('raccourcit les titres trop longs', () => {
    const m = buildMessage('Léa', { participantId: 'a', rank: null, challenges: ['x'.repeat(60)], publicPrize: false })
    expect(m).toContain('…')
    expect(m.length).toBeLessThan(200)
  })
})

describe('firstName et maskPhone', () => {
  it('prend le premier mot du nom', () => expect(firstName('  jean-michel ako ')).toBe('jean-michel'))
  it('masque un mobile français', () => expect(maskPhone('33685821481')).toBe('06 ** ** ** 81'))
  it('masque un numéro étranger', () => expect(maskPhone('590690123456')).toBe('+590 ** ** ** 56'))
})
