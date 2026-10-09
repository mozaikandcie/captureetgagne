// Saisie des notes (pur, testé).

export interface NoteForm {
  respect: number
  quality: number
  originality: number
  comment: string
}

export const emptyNote: NoteForm = { respect: 5, quality: 5, originality: 5, comment: '' }

export const clampNote = (n: number) => Math.min(10, Math.max(0, Math.round(Number.isFinite(n) ? n : 0)))

/** Moyenne des 3 critères pour l'aperçu (même formule que `entryScore` dans lib/score.ts, pour un juré). */
export const average = (n: Pick<NoteForm, 'respect' | 'quality' | 'originality'>) =>
  (n.respect + n.quality + n.originality) / 3

/** Envois validés que ce juré n'a pas encore notés, du plus ancien au plus récent. */
export function toScore<T extends { id: string; createdAt: string; status: string }>(entries: T[], scoredIds: Set<string>): T[] {
  return entries
    .filter((e) => e.status === 'ok' && !scoredIds.has(e.id))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}
