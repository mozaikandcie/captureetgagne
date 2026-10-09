import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { localized, useMe } from '../../lib/me'
import { useI18n } from '../../i18n'

interface Payload { key: string; challengeId?: string; reason?: string | null }

/** Notifications du participant, affichées dans sa langue à partir de la clé + variables stockées. */
export default function NotificationsPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const { t, lang } = useI18n()
  const { me, loading } = useMe(eventId)
  const qc = useQueryClient()

  const challenges = useQuery({
    queryKey: ['challenges', eventId],
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

  if (loading || notifs.isLoading) return <main className="page"><p role="status">{t('loading')}</p></main>
  if (!me) return <main className="page"><p role="alert">{t('eventNotFound')}</p></main>

  const text = (p: Payload) => {
    const challenge = localized(challenges.data?.find((c) => c.id === p.challengeId)?.title, lang)
    return t(p.key, { challenge })
  }
  const hasUnread = notifs.data?.some((n) => !n.read_at)

  return (
    <main className="page">
      <h1>{t('myNotifs')}</h1>
      <p><Link to={`/e/${eventId}/defis`}>{t('back')}</Link></p>
      {hasUnread && <button type="button" className="link" onClick={() => void markAllRead()}>{t('readAll')}</button>}
      {notifs.data?.length === 0 && <p>{t('notifsEmpty')}</p>}
      <ul className="cards">
        {notifs.data?.map((n) => {
          const p = n.payload as Payload
          return (
            <li key={n.id} className="card">
              <p>{!n.read_at && <strong>● <span className="sr">{t('unread')} </span></strong>}{text(p)}</p>
              {p.reason && <p className="help">{t('nReason', { reason: p.reason })}</p>}
            </li>
          )
        })}
      </ul>
    </main>
  )
}
