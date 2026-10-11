import { useQuery } from '@tanstack/react-query'
import { callFunction } from '../../lib/functions'
import { useI18n } from '../../i18n'

/** Seuils : l'inscription de 200 personnes, avec renvois et SMS aux gagnants, demande environ 300 SMS. */
export const SMS_LOW = 300
export const SMS_CRITICAL = 50

export function smsLevel(credits: number | null): 'unknown' | 'ok' | 'low' | 'critical' {
  if (credits === null) return 'unknown'
  return credits < SMS_CRITICAL ? 'critical' : credits < SMS_LOW ? 'low' : 'ok'
}

/** Réserve de SMS Brevo : à regarder avant l'événement, car sans crédit plus personne ne peut se connecter. */
export default function SmsStatus() {
  const { t } = useI18n()
  const status = useQuery({
    queryKey: ['sms-credits'],
    refetchInterval: 5 * 60_000,
    queryFn: async (): Promise<number | null> => {
      const res = await callFunction('sms-status')
      if (!res.ok) throw new Error(String(res.status))
      return (await res.json()).credits ?? null
    },
  })
  const level = status.isError ? 'unknown' : smsLevel(status.data ?? null)
  return (
    <div className="stack">
      <p className="help">{t('smsCreditsHelp')}</p>
      {status.isLoading
        ? <p role="status">…</p>
        : level === 'unknown'
          ? <p role="status" className="notice">{t('smsCreditsUnknown')}</p>
          : <p role={level === 'ok' ? 'status' : 'alert'} className={level === 'ok' ? 'ok' : 'err'}>
              <b>{t('smsCredits', { n: status.data! })}</b>{level !== 'ok' && ` ${t(level === 'low' ? 'smsCreditsLow' : 'smsCreditsCritical', { n: SMS_LOW })}`}
            </p>}
    </div>
  )
}
