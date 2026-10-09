import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useI18n } from '../../i18n'
import { useQr } from './useQr'

/** Outils de l'organisation : QR code, mur, remise des prix, export ZIP. */
export default function ToolsTab({ eventId, isOrganizer }: { eventId: string; isOrganizer: boolean }) {
  const { t } = useI18n()
  const [link, setLink] = useState(`${location.origin}/e/${eventId}`)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const qr = useQr(link || `${location.origin}/e/${eventId}`, 640)

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setMessage({ text: t('linkCopied'), error: false })
    } catch {
      setMessage({ text: link, error: false })
    }
  }

  async function exportZip() {
    setBusy(true)
    setMessage(null)
    try {
      const { data } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-zip?event=${eventId}`, {
        headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
      })
      if (!res.ok) throw new Error(String(res.status))
      const url = URL.createObjectURL(await res.blob())
      const a = document.createElement('a')
      a.href = url
      a.download = 'capture-et-gagne.zip'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setMessage({ text: t('exportFailed'), error: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <div className="row">
        <Link className="btn" to={`/jury/${eventId}/mur`}>{t('launchWall')}</Link>
        {isOrganizer && <Link className="btn" to={`/jury/${eventId}/remise`}>{t('launchCeremony')}</Link>}
      </div>
      <p className="help">{t('wallNote')} {t('cerNote')}</p>

      <h2>{t('qrTitle')}</h2>
      <label className="f">
        <span>{t('qrLinkLabel')}</span>
        <input type="text" value={link} onChange={(e) => setLink(e.target.value.trim())} />
      </label>
      {qr && <img className="qr" src={qr} alt={t('wallScan')} />}
      <div className="row">
        {qr && <a className="btn" href={qr} download="affichette-qr-capture-et-gagne.png">{t('qrDownload')}</a>}
        <button type="button" className="btn ghost" onClick={() => void copy()}>{t('qrCopy')}</button>
      </div>

      {isOrganizer && (
        <>
          <h2>{t('exportZip')}</h2>
          <p className="help">{t('exportNote')}</p>
          <button type="button" className="btn" disabled={busy} onClick={() => void exportZip()}>
            {busy ? t('exporting') : t('exportZip')}
          </button>
        </>
      )}
      {message && <p role={message.error ? 'alert' : 'status'} className={message.error ? 'err' : undefined}>{message.text}</p>}
    </section>
  )
}
