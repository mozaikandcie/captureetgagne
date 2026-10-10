// Résumé de la file d'envois pour le bandeau permanent : une seule phrase claire, l'action en premier. Pur, testé.
export type TrayState = 'idle' | 'failed' | 'stalled' | 'uploading' | 'waiting'

export interface TraySummary {
  state: TrayState
  waiting: number
  uploading: number
  /** Envois en cours qui n'avancent plus (réseau instable). */
  stalled: number
  failed: number
  /** Avancement moyen des envois en cours, 0 à 100. */
  percent: number
}

export function summarizeQueue(items: { status: 'queued' | 'uploading' | 'error'; progress: number; stalled?: boolean }[]): TraySummary {
  const uploading = items.filter((i) => i.status === 'uploading')
  const waiting = items.filter((i) => i.status === 'queued').length
  const failed = items.filter((i) => i.status === 'error').length
  const percent = uploading.length ? Math.round((uploading.reduce((s, i) => s + i.progress, 0) / uploading.length) * 100) : 0
  // Un échec demande une action du participant : il passe avant le reste.
  const stalled = uploading.filter((i) => i.stalled).length
  const state: TrayState = failed ? 'failed' : stalled ? 'stalled' : uploading.length ? 'uploading' : waiting ? 'waiting' : 'idle'
  return { state, waiting, uploading: uploading.length, stalled, failed, percent }
}
