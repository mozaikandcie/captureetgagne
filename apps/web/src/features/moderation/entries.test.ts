import { describe, expect, it } from 'vitest'
import { applyFilters, favoriteCount, noFilters, pendingQueue, type ModEntry } from './entries'

const e = (id: string, o: Partial<ModEntry> = {}): ModEntry => ({
  id, challengeId: 'c1', kind: 'photo', status: 'pending', favorite: false,
  createdAt: `2026-12-19T20:0${id}:00Z`, ...o,
})

const list = [
  e('3'), e('1'), e('2', { status: 'ok', favorite: true }),
  e('4', { status: 'rejected', challengeId: 'c2', kind: 'video' }),
]

describe('pendingQueue', () => {
  it('garde les envois à modérer, du plus ancien au plus récent', () => {
    expect(pendingQueue(list).map((x) => x.id)).toEqual(['1', '3'])
  })
})

describe('applyFilters', () => {
  it('ne filtre rien par défaut', () => {
    expect(applyFilters(list, noFilters)).toHaveLength(4)
  })
  it('combine statut, défi et type', () => {
    expect(applyFilters(list, { status: 'rejected', challengeId: 'c2', kind: 'video' }).map((x) => x.id)).toEqual(['4'])
    expect(applyFilters(list, { ...noFilters, status: 'ok', kind: 'video' })).toEqual([])
  })
})

describe('favoriteCount', () => {
  it('compte par type de média', () => {
    expect(favoriteCount(list, 'photo')).toBe(1)
    expect(favoriteCount(list, 'video')).toBe(0)
  })
})
