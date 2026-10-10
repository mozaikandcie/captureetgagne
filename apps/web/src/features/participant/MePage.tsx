import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useI18n } from '../../i18n'
import Onboarding from '../inscription/Onboarding'
import { encouragement, type RankLine } from './encouragement'
import { progress, useChallenges, useMyEntries, useUnreadCount, type ParticipantCtx } from './data'

/** « Moi » : classement et encouragement, accès à mes contenus, notifications, règlement, données personnelles. */
export default function MePage() {
  const { event, me } = useOutletContext<ParticipantCtx>()
  const { t } = useI18n()
  const [intro, setIntro] = useState(false)
  const unread = useUnreadCount(me.id)
  const entries = useMyEntries(me.id)
  const challenges = useChallenges(event.id)

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

  const enc = ranking.data ? encouragement(ranking.data, me.id) : null
  const left = Math.max(0, (challenges.data?.length ?? 0) - progress(entries.data ?? []).sent.size)
  const points = (g: number) => (g < 1 ? t('few') : t('pts', { n: Math.ceil(g) }))
  // Le classement n'est définitif qu'une fois l'événement clôturé par l'organisation.
  const provisional = event.status !== 'closed' ? t('prov') : ''

  return (
    <>
      <section className="box">
        <h2>{me.display_name}</h2>
        {enc && (
          <div className="rankcard">
            <span className="big" aria-hidden="true">{enc.rank}{enc.rank === 1 ? 're' : 'e'}</span>
            <div>
              <p><strong>{t('myRank', { p: provisional, r: enc.rank, n: enc.total, s: enc.score.toFixed(1).replace('.', ',') })}</strong></p>
              <p className="help">{t(enc.key, { g: points(enc.gap) })}</p>
              {left > 0 && <p className="help">{t('left', { n: left })}</p>}
            </div>
          </div>
        )}
      </section>

      <section className="box">
        <Link className="btn ghost" to={`/e/${event.id}/contenus`}>{t('mine')}</Link>
        <Link className="btn ghost" to={`/e/${event.id}/notifications`}>
          🔔 {t('myNotifs')}{unread.data ? ` · ${t('meUnread', { n: unread.data })}` : ''}
        </Link>
        <Link className="btn ghost" to={`/e/${event.id}/reglement`}>{t('rules')}</Link>
        <Link className="btn ghost" to="/donnees-personnelles">{t('footData')}</Link>
        <button type="button" className="btn ghost" onClick={() => setIntro(true)}>{t('obAgain')}</button>
        <button type="button" className="btn soft" onClick={() => void supabase.auth.signOut()}>{t('out')}</button>
      </section>
      {intro && <Onboarding onClose={() => setIntro(false)} />}
    </>
  )
}
