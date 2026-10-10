import { useEffect } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { localized } from '../../lib/me'
import type { ParticipantCtx } from '../participant/data'
import { useI18n } from '../../i18n'

interface Payload {
  key: string
  challengeId?: string
  reason?: string | null
  comment?: string
  rank?: number
  total?: number
  score?: number
  provisional?: boolean
}

/** Notifications du participant, affichées dans sa langue à partir de la clé + variables stockées. */
export default function NotificationsPage() {
  const { event, me } = useOutletContext<ParticipantCtx>()
  const eventId = event.id
  const { t, lang } = useI18n()
  const qc = useQueryClient()

  const challenges = useQuery({
    queryKey: ['challenge-titles', eventId],
    queryFn: async () => {
      const { data, error } = await supabase.from('challenges').select('id, title').eq('event_id', eventId!)
      if (error) throw error
      return data as { id: string; title: Record<string, string> }[]
    },
    enabled: !!eventId,
  })

  const notifs = useQuery({
    queryKey: ['notifications', me?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications').select('id, kind, payload, read_at, created_at')
        .eq('participant_id', me!.id).order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!me,
  })

  // Temps réel : une nouvelle notification apparaît sans recharger.
  useEffect(() => {
    if (!me) return
    const channel = supabase
      .channel(`notifs-${me.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `participant_id=eq.${me.id}` },
        () => void qc.invalidateQueries({ queryKey: ['notifications', me.id] }))
      .subscribe()
    return () => void supabase.removeChannel(channel)
  }, [me, qc])

  async function markAllRead() {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() })
      .eq('participant_id', me!.id).is('read_at', null)
    await qc.invalidateQueries({ queryKey: ['notifications', me!.id] })
  }

  if (notifs.isLoading) return <p role="status">{t('loading')}</p>

  const text = (p: Payload) => {
    const challenge = localized(challenges.data?.find((c) => c.id === p.challengeId)?.title, lang)
    // Le rang commande le singulier de « 1re ».
    const rank = p.rank ?? 0
    return t(p.key, { challenge, rank, total: p.total ?? 0, score: p.score ?? 0, ...(p.key === 'nRang' ? { count: rank } : {}) }) +
      (p.provisional ? ' ' + t('nRangProv') : '')
  }
  const hasUnread = notifs.data?.some((n) => !n.read_at)

  return (
    <section className="box">
      <h2>{t('myNotifs')}</h2>
      <p><Link to={`/e/${eventId}/moi`}>{t('back')}</Link></p>
      {hasUnread && <button type="button" className="link" onClick={() => void markAllRead()}>{t('readAll')}</button>}
      {notifs.data?.length === 0 && <p>{t('notifsEmpty')}</p>}
      <ul className="cards">
        {notifs.data?.map((n) => {
          const p = n.payload as Payload
          return (
            <li key={n.id} className="card">
              <p>{!n.read_at && <strong>● <span className="sr">{t('unread')} </span></strong>}{text(p)}</p>
              {p.reason && <p className="help">{t('nReason', { reason: p.reason })}</p>}
              {p.comment && <p className="help">{t('nComText', { comment: p.comment })}</p>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
