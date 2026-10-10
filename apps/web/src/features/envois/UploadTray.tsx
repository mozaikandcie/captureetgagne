import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { retryAll } from './queue'
import { summarizeQueue } from './summary'
import { useQueue } from './useQueue'

/**
 * Bandeau permanent des envois (sur toutes les pages du participant) : en attente de réseau, en cours,
 * échec, ou « Envoyé ». En réseau faible, le participant sait toujours où en est chacun de ses fichiers.
 */
export default function UploadTray({ eventId }: { eventId: string }) {
  const { t } = useI18n()
  const items = useQueue()
  const [sent, setSent] = useState(false)

  // Confirmation brève quand un fichier vient d'arriver sur le serveur.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const onSent = () => { setSent(true); clearTimeout(timer); timer = setTimeout(() => setSent(false), 5000) }
    window.addEventListener('cg-entry-sent', onSent)
    return () => { window.removeEventListener('cg-entry-sent', onSent); clearTimeout(timer) }
  }, [])

  const s = summarizeQueue(items)
  if (s.state === 'idle' && !sent) return null

  return (
    <div className={`tray ${s.state}`} role="status" aria-live="polite">
      {s.state === 'failed' && (
        <>
          <span><b>⚠ {t('trayFailed', { n: s.failed })}</b> {t('trayFailedHelp')}</span>
          <span className="row">
            <button type="button" className="btn small" onClick={retryAll}>{t('trayRetry')}</button>
            <Link className="btn small ghost" to={`/e/${eventId}/defis`}>{t('trayDetails')}</Link>
          </span>
        </>
      )}
      {s.state === 'stalled' && (
        <span><b>📶 {t('trayStalled')}</b> {t('trayStalledHelp')}</span>
      )}
      {s.state === 'uploading' && (
        <span><b>⬆ {t('trayUploading', { n: s.uploading, p: s.percent })}</b>{s.waiting > 0 && <> · {t('trayWaiting', { n: s.waiting })}</>}</span>
      )}
      {s.state === 'waiting' && (
        <span><b>⏳ {t('trayWaiting', { n: s.waiting })}</b> {t('trayKept')}</span>
      )}
      {s.state === 'idle' && sent && <span><b>✓ {t('traySent')}</b></span>}
    </div>
  )
}
