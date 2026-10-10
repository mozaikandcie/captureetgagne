import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n'

const pad = (n: number) => String(n).padStart(2, '0')

/** Décompte jusqu'à la fin des envois (`events.ends_at`). Ne s'affiche pas sans date de fin. */
export default function Countdown({ endsAt }: { endsAt: string | null }) {
  const { t } = useI18n()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!endsAt) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [endsAt])
  if (!endsAt) return null

  const left = new Date(endsAt).getTime() - now
  if (left <= 0) return <p className="pill bad" role="status">{t('ended')}</p>
  const s = Math.floor(left / 1000)
  const text = `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
  // Pas de annonce à chaque seconde pour les lecteurs d'écran : le texte complet est dans aria-label.
  return <p className="pill" aria-label={`${t('endsIn')} ${text}`}><span aria-hidden="true">⏱ {t('endsIn')} {text}</span></p>
}
