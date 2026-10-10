import { describe, expect, it } from 'vitest'
import { classifySmsError, clearPending, loadPending, resendLeft, savePending } from './sms'

describe('classifySmsError', () => {
  it('reconnaît une coupure réseau', () => {
    expect(classifySmsError({ name: 'AuthRetryableFetchError', status: 0 }, 'send').kind).toBe('network')
    expect(classifySmsError({ message: 'Failed to fetch' }, 'verify').kind).toBe('network')
  })
  it('une panne serveur (5xx) n’est pas une coupure réseau', () => {
    expect(classifySmsError({ name: 'AuthRetryableFetchError', status: 503 }, 'send').kind).toBe('sendFailed')
    expect(classifySmsError({ name: 'AuthRetryableFetchError', status: 500 }, 'send').kind).toBe('sendFailed')
  })
  it('reconnaît la limite d’envois et lit le délai donné par Supabase', () => {
    const e = { code: 'over_sms_send_rate_limit', status: 429, message: 'For security purposes, you can only request this after 42 seconds.' }
    expect(classifySmsError(e, 'send')).toEqual({ kind: 'rateLimit', wait: 42 })
  })
  it('prend 60 s par défaut quand le délai n’est pas indiqué', () => {
    expect(classifySmsError({ status: 429 }, 'send')).toEqual({ kind: 'rateLimit', wait: 60 })
  })
  it('distingue un échec d’envoi du SMS d’un numéro invalide', () => {
    expect(classifySmsError({ code: 'sms_send_failed', status: 500 }, 'send').kind).toBe('sendFailed')
    expect(classifySmsError({ status: 502 }, 'send').kind).toBe('sendFailed')
    expect(classifySmsError({ code: 'validation_failed', status: 422 }, 'send').kind).toBe('invalidPhone')
    expect(classifySmsError({ status: 400, message: 'Invalid phone number' }, 'send').kind).toBe('invalidPhone')
  })
  it('traite un code expiré ou invalide comme un mauvais code', () => {
    expect(classifySmsError({ code: 'otp_expired', status: 403 }, 'verify').kind).toBe('wrongCode')
  })
  it('renvoie « inconnu » pour le reste', () => {
    expect(classifySmsError({ status: 418 }, 'send').kind).toBe('unknown')
  })
})

describe('resendLeft', () => {
  it('décompte puis atteint 0', () => {
    expect(resendLeft(1000, 1000)).toBe(60)
    expect(resendLeft(1000, 31_000)).toBe(30)
    expect(resendLeft(1000, 61_000)).toBe(0)
    expect(resendLeft(1000, 999_000)).toBe(0)
  })
})

describe('reprise après interruption', () => {
  const store = () => {
    const m = new Map<string, string>()
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }
  }
  it('retrouve le numéro et l’heure d’envoi', () => {
    const s = store()
    savePending({ phone: '+33612345678', sentAt: 5000 }, s)
    expect(loadPending(6000, s)).toEqual({ phone: '+33612345678', sentAt: 5000 })
  })
  it('oublie une demande vieille de plus de 10 minutes', () => {
    const s = store()
    savePending({ phone: '+33612345678', sentAt: 0 }, s)
    expect(loadPending(11 * 60_000, s)).toBeNull()
    expect(loadPending(11 * 60_000, s)).toBeNull()
  })
  it('efface la demande', () => {
    const s = store()
    savePending({ phone: '+33612345678', sentAt: 0 }, s)
    clearPending(s)
    expect(loadPending(1, s)).toBeNull()
  })
  it('ignore des données illisibles', () => {
    const s = store(); s.setItem('cg-sms-pending', '{pas du json')
    expect(loadPending(1, s)).toBeNull()
  })
})
