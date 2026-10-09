// Déroulé de la remise des prix (pur, testé). Reprend le prototype : prix par défi, puis podium de la 3e à la 1re place.
import { bestOf, entryScore, standings, type ScoredEntry, type StandingRow } from '../../lib/score'

export interface CeremonyEntry extends ScoredEntry {
  kind: 'photo' | 'video'
  url: string | null
}

export type Step =
  | { type: 'intro' }
  | { type: 'prize'; challengeId: string; entry: CeremonyEntry; note: number }
  | { type: 'podium'; rank: 1 | 2 | 3; row: StandingRow; entry?: CeremonyEntry }
  | { type: 'end' }

export function buildSteps(
  challengeIds: string[],
  participantIds: string[],
  entries: CeremonyEntry[],
  jurorCount: number,
): Step[] {
  const ok = entries.filter((e) => e.status === 'ok')
  const steps: Step[] = [{ type: 'intro' }]

  for (const challengeId of challengeIds) {
    const best = bestOf(ok.filter((e) => e.challengeId === challengeId))
    if (best) steps.push({ type: 'prize', challengeId, entry: best, note: entryScore(best)! })
  }

  const ranked = standings(participantIds, entries, challengeIds.length, jurorCount)
    .filter((r) => r.done > 0)
    .slice(0, 3)
  // Annonce de la 3e place vers la 1re.
  for (let i = ranked.length - 1; i >= 0; i--) {
    const row = ranked[i]
    const entry = bestOf(ok.filter((e) => e.participantId === row.participantId))
    steps.push({ type: 'podium', rank: (i + 1) as 1 | 2 | 3, row, entry })
  }

  steps.push({ type: 'end' })
  return steps
}
