import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useI18n } from '../../i18n'
import { encouragement, type RankLine } from './encouragement'
import { progress, useChallenges, useMyEntries, useUnreadCount, type ParticipantCtx } from './data'
import NotifPanel from './NotifPanel'

/** Carte « Bonjour {prénom} ! » : progression, notifications, message d'encouragement, changement de participant. */
export default function MyBox({ ctx, withBar = false }: { ctx: ParticipantCtx; withBar?: boolean }) {
  const { t } = useI18n()
  const { event, me } = ctx
  const [open, setOpen] = useState(false)
  const challenges = useChallenges(event.id)
  const entries = useMyEntries(me.id)
  const unread = useUnreadCount(me.id)

  const ranking = useQuery({
    queryKey: ['standings', event.id],
    refetchInterval: 30000,
    queryFn: async (): Promise<RankLine[]> => {
      const { data, error } = await supabase.rpc('standings', { p_event: event.id })
      if (error) throw error
      return (data ?? []).map((r: Record<string, unknown>) => ({
        participantId: r.participant_id as string, score: Number(r.score ?? 0), done: r.done as number,
      }))
    },
  })

  const total = challenges.data?.length ?? 0
  const { sent } = progress(entries.data ?? [])
  const left = Math.max(0, total - sent.size)
  const enc = ranking.data ? encouragement(ranking.data, me.id) : null
  const points = (g: number) => (g < 1 ? t('few') : t('pts', { n: Math.ceil(g) }))
  const provisional = event.status !== 'closed' ? t('prov') : ''
  const ord = (n: number) => (n === 1 ? t('cerPlace1') : t('cerPlaceN', { n }))

  return (
    <section className="box">
      <div className="row">
        <div className="grow">
          <h2>{t('hello', { n: me.display_name.split(' ')[0] })}</h2>
          <p className="help">{t('count', { d: sent.size, n: total })}</p>
        </div>
        <button type="button" className="bell" aria-expanded={open} onClick={() => setOpen(!open)}>
          🔔 {t('notifs')}{unread.data ? <span className="cnt">{unread.data}</span> : null}
        </button>
        <button type="button" className="btn ghost small" onClick={() => void supabase.auth.signOut()}>{t('out')}</button>
      </div>
      {withBar && (
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={sent.size}
          aria-label={t('count', { d: sent.size, n: total })}><i style={{ width: `${total ? (sent.size / total) * 100 : 0}%` }} /></div>
      )}
      {open && <NotifPanel eventId={event.id} participantId={me.id} />}
      {enc && (
        <div className="encour">
          <span className="rk" aria-hidden="true">{enc.rank === 1 ? '1re' : `${enc.rank}e`}</span>
          <div>
            <b>{t('myRank', { p: provisional, r: enc.rank, n: enc.total, s: enc.score.toFixed(1).replace('.', ',') })}</b>
            {t(enc.key, { g: points(enc.gap) })} {left > 0 ? t('left', { n: left }) : t('noLeft')}
            <span className="sr"> {ord(enc.rank)}</span>
          </div>
        </div>
      )}
    </section>
  )
}
