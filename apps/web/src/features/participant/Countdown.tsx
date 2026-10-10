import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n'

const pad = (n: number) => String(n).padStart(2, '0')

/** Texte du décompte jusqu'à `endsAt` (format du prototype : « 2 h 05 min 09 s »). `null` sans date de fin. */
export function useCountdown(endsAt: string | null): { text: string; ended: boolean } | null {
  const { t } = useI18n()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!endsAt) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [endsAt])
  if (!endsAt) return null
  const ms = new Date(endsAt).getTime() - now
  if (ms <= 0) return { text: t('ended'), ended: true }
  const h = Math.floor(ms / 3600e3)
  const m = Math.floor((ms % 3600e3) / 60e3)
  const s = Math.floor((ms % 60e3) / 1e3)
  return { text: `${t('endsIn')} ${h ? `${h} h ${pad(m)} min ${pad(s)} s` : `${m} min ${pad(s)} s`}`, ended: false }
}
