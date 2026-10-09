// Filtrage et tri des envois pour la modération (pur, testé).

export type Status = 'pending' | 'ok' | 'rejected'
export type Kind = 'photo' | 'video'

export interface ModEntry {
  id: string
  challengeId: string
  kind: Kind
  status: Status
  favorite: boolean
  createdAt: string
}

export interface Filters {
  status: Status | 'all'
  challengeId: string | 'all'
  kind: Kind | 'all'
}

export const noFilters: Filters = { status: 'all', challengeId: 'all', kind: 'all' }

export function applyFilters<T extends ModEntry>(entries: T[], f: Filters): T[] {
  return entries.filter(
    (e) =>
      (f.status === 'all' || e.status === f.status) &&
      (f.challengeId === 'all' || e.challengeId === f.challengeId) &&
      (f.kind === 'all' || e.kind === f.kind),
  )
}

/** File « à la chaîne » : les envois à modérer, du plus ancien au plus récent. */
export function pendingQueue<T extends ModEntry>(entries: T[]): T[] {
  return entries
    .filter((e) => e.status === 'pending')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

/** Nombre de coups de cœur déjà utilisés pour un type de média (limite : 3). */
export function favoriteCount(entries: ModEntry[], kind: Kind): number {
  return entries.filter((e) => e.favorite && e.kind === kind).length
}
