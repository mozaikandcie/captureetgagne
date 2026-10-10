import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useI18n } from '../../i18n'
import { normalizePhone } from './phone'

type Step = 'phone' | 'code'

/** Téléphone → code SMS. La session est mise à jour par onAuthStateChange. */
export default function PhoneForm() {
  const { t } = useI18n()
  const [step, setStep] = useState<Step>('phone')
  const [raw, setRaw] = useState('')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function sendCode(e: FormEvent) {
    e.preventDefault()
    const normalized = normalizePhone(raw)
    if (!normalized) return setError(t('badPhone'))
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({ phone: normalized })
    setBusy(false)
    if (error) return setError(t('netError'))
    setPhone(normalized)
    setStep('code')
  }

  async function verify(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.verifyOtp({ phone, token: code.trim(), type: 'sms' })
    setBusy(false)
    if (error) setError(t('wrongCode'))
    // En cas de succès, onAuthStateChange met la session à jour.
  }

  return step === 'phone' ? (
    <form onSubmit={sendCode} noValidate className="stack">
      <label className="f">
        <span>{t('phone')}</span>
        <input type="tel" inputMode="tel" autoComplete="tel" value={raw}
          onChange={(e) => setRaw(e.target.value)} aria-describedby="phoneHelp" />
      </label>
      <p id="phoneHelp" className="help">{t('phoneHelp')}</p>
      {error && <p role="alert" className="err">{error}</p>}
      <button type="submit" className="btn" disabled={busy}>{t('sendCode')}</button>
    </form>
  ) : (
    <form onSubmit={verify} noValidate className="stack">
      <p role="status">{t('codeSent', { phone })}</p>
      <label className="f">
        <span>{t('codeLabel')}</span>
        <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
          value={code} onChange={(e) => setCode(e.target.value)} />
      </label>
      {error && <p role="alert" className="err">{error}</p>}
      <button type="submit" className="btn" disabled={busy || code.trim().length < 6}>{t('verify')}</button>
      <button type="button" className="link" onClick={() => { setStep('phone'); setCode(''); setError(null) }}>
        {t('changeNumber')}
      </button>
    </form>
  )
}
