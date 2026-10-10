import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n'
import { formatRemaining } from '../../lib/format'

/** Texte du décompte jusqu'à `endsAt` (« 12 j 04 h », « 5 h 07 min », « 8 min 03 s »). `null` sans date de fin. */
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
  return { text: `${t('endsIn')} ${formatRemaining(ms)}`, ended: false }
}
