import { useState } from 'react'
import { callFunction } from '../../lib/functions'
import { useI18n } from '../../i18n'

interface Winner { participantId: string; name: string; rank: number | null; phoneMasked: string | null; message: string; alreadySent: boolean }
interface Result { sent: number; skipped: number; failed: { name: string; reason: string }[] }

/** SMS aux gagnants : on montre d'abord la liste et les messages, l'envoi demande une confirmation. */
export default function WinnersSms({ eventId, toast }: { eventId: string; toast: (text: string, error?: boolean) => void }) {
  const { t } = useI18n()
  const [winners, setWinners] = useState<Winner[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  async function call(dry: boolean) {
    setBusy(true)
    try {
      const res = await callFunction('notify-winners', { body: { event: eventId, dry } })
      if (!res.ok) throw new Error(String(res.status))
      return await res.json()
    } catch {
      toast(t('winSmsError'), true)
      return null
    } finally {
      setBusy(false)
    }
  }

  async function preview() {
    setResult(null)
    const data = await call(true)
    if (data) setWinners(data.winners)
  }

  async function send() {
    const data = await call(false) as Result | null
    if (!data) return
    setResult(data)
    setWinners(null)
  }

  const todo = (winners ?? []).filter((w) => !w.alreadySent && w.phoneMasked)
  return (
    <div className="stack">
      <p className="help">{t('winSmsHelp')}</p>
      <div className="row"><button type="button" className="btn small ghost" disabled={busy} onClick={() => void preview()}>{t('winSmsPreview')}</button></div>
      {winners && winners.length === 0 && <p className="help" role="status">{t('winSmsNone')}</p>}
      {winners && winners.length > 0 && (
        <>
          <ul className="hist">
            {winners.map((w) => (
              <li key={w.participantId}>
                <div className="hn"><b>{w.name}</b><span className="help">{w.phoneMasked ?? t('winSmsNoPhone')}{w.alreadySent ? ` · ${t('winSmsAlready')}` : ''}</span></div>
                <span className="help">{w.message}</span>
              </li>
            ))}
          </ul>
          <p className="notice" role="note">{t('winSmsCheck')}</p>
          <div className="row">
            <button type="button" className="btn small" disabled={busy || todo.length === 0} onClick={() => void send()}>
              {busy ? t('winSmsSending') : t('winSmsSend', { n: todo.length })}
            </button>
            <button type="button" className="btn small ghost" onClick={() => setWinners(null)}>{t('cancel')}</button>
          </div>
        </>
      )}
      {result && (
        <p role="status" className={result.failed.length ? 'err' : 'ok'}>
          {t('winSmsDone', { n: result.sent })}
          {result.skipped > 0 && ` ${t('winSmsSkipped', { n: result.skipped })}`}
          {result.failed.length > 0 && ` ${t('winSmsFailed', { names: result.failed.map((f) => `${f.name} (${f.reason})`).join(', ') })}`}
        </p>
      )}
    </div>
  )
}
