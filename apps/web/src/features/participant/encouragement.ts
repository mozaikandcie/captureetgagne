// Message d'encouragement de l'écran « Moi » (textes enc1 à enc4 du prototype). Pur, testé.
import { rankOf } from '../classement/status'

export interface RankLine {
  participantId: string
  score: number
  done: number
}

export interface Encouragement {
  rank: number
  total: number
  score: number
  /** Clé de traduction : enc1 (en tête), enc2 (podium), enc3 (en progression), enc4 (rien de validé). */
  key: 'enc1' | 'enc2' | 'enc3' | 'enc4'
  /** Points qui séparent de la place au-dessus (0 pour la 1re place). */
  gap: number
}

/** `rows` est le classement dans l'ordre (meilleur en premier). `null` si le participant n'y figure pas. */
export function encouragement(rows: RankLine[], participantId: string): Encouragement | null {
  const index = rows.findIndex((r) => r.participantId === participantId)
  const rank = rankOf(rows, participantId)
  if (index < 0 || rank === null) return null
  const me = rows[index]
  const gap = index > 0 ? Math.max(0, rows[index - 1].score - me.score) : 0
  const key = me.done === 0 ? 'enc4' : rank === 1 ? 'enc1' : rank <= 3 ? 'enc2' : 'enc3'
  return { rank, total: rows.length, score: me.score, key, gap }
}
