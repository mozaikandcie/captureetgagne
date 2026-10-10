import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'

/** Bandeau « hors connexion » : les envois en attente repartent seuls au retour du réseau. */
export default function OfflineBanner() {
  const { t } = useI18n()
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false)
    window.addEventListener('online', on); window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  if (online) return null
  return <div className="offline" role="status">{t('offlineBanner')}</div>
}
