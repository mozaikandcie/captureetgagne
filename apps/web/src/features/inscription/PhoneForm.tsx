import { useEffect, useRef, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useI18n } from '../../i18n'
import { normalizePhone } from './phone'
import { classifySmsError, clearPending, loadPending, resendLeft, savePending, type SmsError } from './sms'

const ERROR_TEXT: Record<SmsError['kind'], string> = {
  rateLimit: 'smsRateLimit', sendFailed: 'smsSendFailed', invalidPhone: 'badPhone', network: 'smsNoNetwork', wrongCode: 'wrongCode', unknown: 'smsUnknown',
}

/** Téléphone → code SMS, avec renvoi du code, erreurs expliquées et reprise après interruption. */
export default function PhoneForm() {
  const { t } = useI18n()
  const resumed = useRef(loadPending())
  const verifying = useRef(false) // évite un double envoi (validation automatique puis clic)
  const [step, setStep] = useState<'phone' | 'code'>(resumed.current ? 'code' : 'phone')
  const [raw, setRaw] = useState('')
  const [phone, setPhone] = useState(resumed.current?.phone ?? '')
  const [sentAt, setSentAt] = useState(resumed.current?.sentAt ?? 0)
  const [code, setCode] = useState('')
  const [error, setError] = useState<SmsError | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [failures, setFailures] = useState(0)
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [wait, setWait] = useState(0) // délai imposé par Supabase (limite d'envois)

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  // Après une limite d'envois, le délai donné par le serveur remplace le délai habituel de 60 s.
  const left = wait ? Math.max(0, wait - Math.floor((now - sentAt) / 1000)) : resendLeft(sentAt, now)

  const fail = (e: SmsError) => { setError(e); setFailures((n) => n + 1); if (e.wait) { setWait(e.wait); setSentAt(Date.now()) } }

  async function send(target: string) {
    setBusy(true); setError(null); setNotice(null)
    const { error: err } = await supabase.auth.signInWithOtp({ phone: target })
    setBusy(false)
    if (err) return fail(classifySmsError(err, 'send'))
    const at = Date.now()
    setPhone(target); setSentAt(at); setWait(0); setStep('code'); setCode(''); setFailures(0)
    savePending({ phone: target, sentAt: at })
  }

  function onSend(e: FormEvent) {
    e.preventDefault()
    const normalized = normalizePhone(raw)
    if (!normalized) { setError({ kind: 'invalidPhone' }); return }
    void send(normalized)
  }

  async function verify(token: string) {
    if (verifying.current || token.length < 6) return
    verifying.current = true
    setBusy(true); setError(null)
    const { error: err } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' })
    verifying.current = false
    setBusy(false)
    if (err) return fail(classifySmsError(err, 'verify'))
    clearPending() // la session est mise à jour par onAuthStateChange
  }

  const showHelp = failures >= 2 || error?.kind === 'sendFailed'
  const message = error && (error.kind === 'rateLimit' ? t(ERROR_TEXT.rateLimit, { n: Math.max(left, 1) }) : t(ERROR_TEXT[error.kind]))

  const feedback = (
    <>
      {message && <p role="alert" className="err">{message}</p>}
      {notice && <p role="status" className="ok">{notice}</p>}
      {showHelp && (
        <div className="notice" role="note">
          <b>{t('smsHelpTitle')}</b>
          <p>{t('smsHelp')}</p>
        </div>
      )}
    </>
  )

  if (step === 'phone') {
    return (
      <form onSubmit={onSend} noValidate className="stack">
        <label className="f">
          <span>{t('phone')}</span>
          <input type="tel" inputMode="tel" autoComplete="tel" value={raw} aria-invalid={error?.kind === 'invalidPhone'}
            onChange={(e) => { setRaw(e.target.value); if (error?.kind === 'invalidPhone') setError(null) }} aria-describedby="phoneHelp" />
        </label>
        <p id="phoneHelp" className="help">{t('phoneHelp')}</p>
        {feedback}
        <button type="submit" className="btn" disabled={busy || (error?.kind === 'rateLimit' && left > 0)}>
          {error?.kind === 'rateLimit' && left > 0 ? t('smsResendIn', { n: left }) : t('sendCode')}
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); void verify(code.trim()) }} noValidate className="stack">
      <p role="status">{t('codeSent', { phone })}</p>
      <label className="f">
        <span>{t('codeLabel')}</span>
        <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code} autoFocus
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 6)
            setCode(v)
            if (v.length === 6) void verify(v) // le code se valide tout seul à 6 chiffres
          }} />
      </label>
      {feedback}
      <button type="submit" className="btn" disabled={busy || code.trim().length < 6}>{t('verify')}</button>
      <button type="button" className="btn ghost" disabled={busy || left > 0}
        onClick={() => void send(phone).then(() => setNotice(t('smsResent')))}>
        {left > 0 ? t('smsResendIn', { n: left }) : t('smsResend')}
      </button>
      <button type="button" className="link" onClick={() => { clearPending(); setStep('phone'); setCode(''); setError(null); setNotice(null); setFailures(0) }}>
        {t('changeNumber')}
      </button>
    </form>
  )
}
