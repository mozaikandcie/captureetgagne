import { describe, expect, it } from 'vitest'
import { encouragement } from './encouragement'

const rows = [
  { participantId: 'a', score: 90, done: 5 },
  { participantId: 'b', score: 70, done: 4 },
  { participantId: 'c', score: 60, done: 3 },
  { participantId: 'd', score: 40, done: 2 },
  { participantId: 'e', score: 0, done: 0 },
]

describe('encouragement', () => {
  it('félicite le premier', () => {
    expect(encouragement(rows, 'a')).toMatchObject({ rank: 1, total: 5, key: 'enc1', gap: 0 })
  })
  it('signale l’écart avec la place au-dessus sur le podium', () => {
    expect(encouragement(rows, 'c')).toMatchObject({ rank: 3, key: 'enc2', gap: 10 })
  })
  it('encourage la progression hors podium', () => {
    expect(encouragement(rows, 'd')).toMatchObject({ rank: 4, key: 'enc3', gap: 20 })
  })
  it('invite à se lancer quand aucun défi n’est validé', () => {
    expect(encouragement(rows, 'e')).toMatchObject({ key: 'enc4' })
  })
  it('renvoie null pour un participant absent', () => {
    expect(encouragement(rows, 'z')).toBeNull()
  })
})
