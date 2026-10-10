// Parcours de connexion par SMS : classement des erreurs, délai de renvoi, reprise après interruption. Pur, testé.

export type SmsErrorKind = 'rateLimit' | 'sendFailed' | 'invalidPhone' | 'network' | 'wrongCode' | 'unknown'

export interface SmsError { kind: SmsErrorKind; /** Secondes à attendre (limite d'envois). */ wait?: number }

interface AuthLikeError { code?: string; status?: number; name?: string; message?: string }

export const RESEND_SECONDS = 60
const PENDING_MINUTES = 10

/** Traduit une erreur Supabase Auth en une cause que le participant peut comprendre et corriger. */
export function classifySmsError(e: AuthLikeError, step: 'send' | 'verify'): SmsError {
  const msg = e.message ?? ''
  // Coupure réseau = aucune réponse du serveur. Une réponse 5xx (même « réessayable » pour la bibliothèque) est une panne côté serveur.
  const noResponse = e.status === 0 || (e.name === 'AuthRetryableFetchError' && !e.status)
  if (noResponse || /failed to fetch|network|load failed/i.test(msg)) return { kind: 'network' }
  if (e.code === 'over_sms_send_rate_limit' || e.code === 'over_request_rate_limit' || e.status === 429) {
    const wait = /(\d+)\s*second/i.exec(msg)?.[1]
    return { kind: 'rateLimit', wait: wait ? Number(wait) : RESEND_SECONDS }
  }
  if (step === 'verify') {
    // Supabase répond « expiré ou invalide » pour un mauvais code comme pour un code périmé.
    return e.code === 'otp_expired' || e.status === 400 || e.status === 403 || e.status === 422 ? { kind: 'wrongCode' } : { kind: 'unknown' }
  }
  if (e.code === 'sms_send_failed' || (e.status !== undefined && e.status >= 500)) return { kind: 'sendFailed' }
  if (e.code === 'validation_failed' || e.code === 'phone_provider_disabled' || /phone/i.test(msg)) return { kind: 'invalidPhone' }
  return { kind: 'unknown' }
}

/** Secondes restantes avant de pouvoir renvoyer un code (0 = possible). */
export function resendLeft(sentAt: number, now: number, seconds = RESEND_SECONDS): number {
  return Math.max(0, Math.ceil((sentAt + seconds * 1000 - now) / 1000))
}

// ---- reprise : si la page est fermée ou rechargée à l'étape du code, on y revient ----
const KEY = 'cg-sms-pending'
export interface Pending { phone: string; sentAt: number }

export function savePending(p: Pending, storage: Pick<Storage, 'setItem'> = sessionStorage) {
  try { storage.setItem(KEY, JSON.stringify(p)) } catch { /* stockage indisponible : pas de reprise, rien de grave */ }
}

export function loadPending(now = Date.now(), storage: Pick<Storage, 'getItem' | 'removeItem'> = sessionStorage): Pending | null {
  try {
    const raw = storage.getItem(KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Pending
    if (typeof p.phone === 'string' && typeof p.sentAt === 'number' && now - p.sentAt < PENDING_MINUTES * 60_000) return p
    storage.removeItem(KEY)
  } catch { /* données illisibles : on ignore */ }
  return null
}

export function clearPending(storage: Pick<Storage, 'removeItem'> = sessionStorage) {
  try { storage.removeItem(KEY) } catch { /* ignoré */ }
}
