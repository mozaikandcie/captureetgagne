import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { localized } from '../../lib/me'
import { useI18n } from '../../i18n'
import { badgeById } from './badges'
import { useChallenges } from './data'

interface Payload {
  key: string
  challengeId?: string
  reason?: string | null
  comment?: string
  rank?: number
  total?: number
  score?: number
  provisional?: boolean
  badge?: string
}

const ICON: Record<string, string> = { defi: '✅', refus: '📷', com: '💬', rang: '📈', badge: '🏅' }

/** Liste des notifications du participant, dans sa langue (titre + texte, comme le prototype). */
export default function NotifPanel({ eventId, participantId }: { eventId: string; participantId: string }) {
  const { t, lang } = useI18n()
  const qc = useQueryClient()
  const challenges = useChallenges(eventId)

  const notifs = useQuery({
    queryKey: ['notifications', participantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications').select('id, kind, payload, read_at, created_at')
        .eq('participant_id', participantId).order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  // Temps réel : une nouvelle notification apparaît sans recharger.
  useEffect(() => {
    const channel = supabase
      .channel(`notifs-${participantId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `participant_id=eq.${participantId}` },
        () => {
          void qc.invalidateQueries({ queryKey: ['notifications', participantId] })
          void qc.invalidateQueries({ queryKey: ['unread', participantId] })
        })
      .subscribe()
    return () => void supabase.removeChannel(channel)
  }, [participantId, qc])

  async function markAllRead() {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('participant_id', participantId).is('read_at', null)
    await qc.invalidateQueries({ queryKey: ['notifications', participantId] })
    await qc.invalidateQueries({ queryKey: ['unread', participantId] })
  }

  const challenge = (id?: string) => localized(challenges.data?.find((c) => c.id === id)?.title as Record<string, string> | undefined, lang)

  function lines(p: Payload): { title: string; body: string } {
    const c = challenge(p.challengeId)
    if (p.key === 'nDefi') return { title: t('nDefiT', { challenge: c }), body: t('nDefiB') }
    if (p.key === 'nRefus') return { title: t('nRefusT', { challenge: c }), body: [t('nRefusB'), p.reason ? t('nReason', { reason: p.reason }) : ''].filter(Boolean).join(' ') }
    if (p.key === 'nCom') return { title: t('nComT', { challenge: c }), body: t('nComText', { comment: p.comment ?? '' }) }
    if (p.key === 'nBadge') {
      const b = badgeById(p.badge ?? '')
      return { title: t('nBadgeT', { name: b ? t(b.name) : '' }), body: t('nBadgeB', { desc: b ? t(b.desc) : '' }) }
    }
    const rank = p.rank ?? 0
    const enc = rank === 1 ? 'enc1' : rank <= 3 ? 'enc2' : 'enc3'
    return {
      title: t('nRangT', { rank, total: p.total ?? 0 }) + (p.provisional ? t('nRangProvT') : ''),
      body: t(enc, { g: t('few') }),
    }
  }

  const list = notifs.data ?? []
  return (
    <div className="notifs">
      <div className="row">
        <h3 className="grow">{t('myNotifs')}</h3>
        {list.some((n) => !n.read_at) && <button type="button" className="btn ghost small" onClick={() => void markAllRead()}>{t('readAll')}</button>}
      </div>
      <ul>
        {list.length === 0 && <li><span className="ic" aria-hidden="true">🔔</span><div><span>{t('notifsEmpty')}</span></div></li>}
        {list.map((n) => {
          const { title, body } = lines(n.payload as Payload)
          return (
            <li key={n.id} className={n.read_at ? '' : 'new'}>
              <span className="ic" aria-hidden="true">{n.kind === 'badge' ? (badgeById((n.payload as Payload).badge ?? '')?.icon ?? '🏅') : ICON[n.kind] ?? '🔔'}</span>
              <div>
                {!n.read_at && <span className="sr">{t('unread')} </span>}
                <b>{title}</b><span>{body}</span>
                <time dateTime={n.created_at}>{new Date(n.created_at).toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'fr-FR', { hour: '2-digit', minute: '2-digit' })}</time>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
