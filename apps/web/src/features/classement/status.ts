// Statut du classement et notes manquantes (pur, testé).

export interface RankRow {
  participantId: string
  displayName: string
  done: number
  jury: number
  top: number
  missing: number
  score: number
}

/** Classement provisoire tant qu'un envoi est à modérer ou qu'une note manque (CLAUDE.md, section 5). */
export function isProvisional(rows: Pick<RankRow, 'missing'>[], pendingCount: number): boolean {
  return pendingCount > 0 || rows.some((r) => r.missing > 0)
}

/** Rang (1-based) d'un participant ; les ex æquo exacts (même score) partagent le même rang. */
export function rankOf(rows: Pick<RankRow, 'participantId' | 'score'>[], participantId: string): number | null {
  const i = rows.findIndex((r) => r.participantId === participantId)
  if (i < 0) return null
  return rows.findIndex((r) => r.score === rows[i].score) + 1
}

export interface JurorMissing {
  jurorId: string
  label: string
  missing: number
}

/** Nombre d'envois validés que chaque juré n'a pas encore notés. */
export function missingByJuror(
  okEntryIds: string[],
  scores: { entryId: string; jurorId: string }[],
  jurors: { id: string; label: string }[],
): JurorMissing[] {
  return jurors.map((j) => {
    const done = new Set(scores.filter((s) => s.jurorId === j.id).map((s) => s.entryId))
    return { jurorId: j.id, label: j.label, missing: okEntryIds.filter((id) => !done.has(id)).length }
  })
}
