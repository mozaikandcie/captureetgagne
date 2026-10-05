// Calcul du score : miroir TypeScript de la vue SQL `standings`.
// Règles reprises à l'identique du prototype (voir CLAUDE.md, section 5).

export type EntryStatus = 'pending' | 'ok' | 'rejected'

export interface JurorScore {
  respect: number
  quality: number
  originality: number
}

export interface ScoredEntry {
  id: string
  participantId: string
  challengeId: string
  status: EntryStatus
  /** Horodatage de validation (ms), sert au départage. */
  validatedAt: number
  /** Une note par juré, clé = identifiant du juré. */
  scores: Record<string, JurorScore>
}

export interface StandingRow {
  participantId: string
  /** Défis validés (au moins un envoi `ok`, noté ou non). */
  done: number
  /** Moyenne des meilleures notes par défi, sur 10. */
  jury: number
  /** Meilleure note individuelle, sur 10. */
  top: number
  /** Horodatage du dernier envoi validé (Infinity si aucun). */
  last: number
  /** Envois validés pas encore notés par tous les jurés. */
  missing: number
  /** Score sur 100, arrondi à 2 décimales. */
  score: number
}

/** Note d'un envoi : moyenne sur les jurés de la moyenne des 3 critères. `null` si personne n'a noté. */
export function entryScore(entry: Pick<ScoredEntry, 'scores'>): number | null {
  const all = Object.values(entry.scores)
  if (all.length === 0) return null
  const sum = all.reduce((acc, s) => acc + (s.respect + s.quality + s.originality) / 3, 0)
  return sum / all.length
}

export function isComplete(entry: Pick<ScoredEntry, 'scores'>, jurorCount: number): boolean {
  return Object.keys(entry.scores).length >= jurorCount
}

/** Classement définitif seulement si rien n'est en attente et que tout est noté par tous les jurés. */
export function scoringDone(entries: ScoredEntry[], jurorCount: number): boolean {
  return (
    !entries.some((e) => e.status === 'pending') &&
    entries.filter((e) => e.status === 'ok').every((e) => isComplete(e, jurorCount))
  )
}

/**
 * Meilleur envoi d'une liste (prix par défi) : meilleure note ; à égalité,
 * le plus de jurés ayant noté, puis l'envoi le plus ancien.
 */
export function bestOf<T extends ScoredEntry>(list: T[]): T | undefined {
  return list
    .filter((e) => entryScore(e) !== null)
    .sort(
      (a, b) =>
        entryScore(b)! - entryScore(a)! ||
        Object.keys(b.scores).length - Object.keys(a.scores).length ||
        a.validatedAt - b.validatedAt,
    )[0]
}

/**
 * Classement général. Départage : score, puis meilleure note individuelle,
 * puis nombre de défis validés, puis dernier envoi validé le plus tôt.
 */
export function standings(
  participantIds: string[],
  entries: ScoredEntry[],
  challengeCount: number,
  jurorCount: number,
): StandingRow[] {
  return participantIds
    .map((participantId) => {
      const mine = entries.filter((e) => e.participantId === participantId && e.status === 'ok')
      const challenges = new Set(mine.map((e) => e.challengeId))
      const bests = [...challenges]
        .map((cid) =>
          Math.max(...mine.filter((e) => e.challengeId === cid).map((e) => entryScore(e) ?? -1)),
        )
        .filter((v) => v >= 0)
      const jury = bests.length ? bests.reduce((a, b) => a + b, 0) / bests.length : 0
      const participation = challengeCount ? challenges.size / challengeCount : 0
      return {
        participantId,
        done: challenges.size,
        jury,
        top: bests.length ? Math.max(...bests) : 0,
        last: mine.length ? Math.max(...mine.map((e) => e.validatedAt)) : Infinity,
        missing: mine.filter((e) => !isComplete(e, jurorCount)).length,
        score: Math.round((30 * participation + 70 * (jury / 10)) * 100) / 100,
      }
    })
    .sort((a, b) => b.score - a.score || b.top - a.top || b.done - a.done || a.last - b.last)
}
