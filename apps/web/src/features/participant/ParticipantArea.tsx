import { Outlet, useMatch, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useMe } from '../../lib/me'
import { useI18n } from '../../i18n'
import Header from '../../components/Header'
import JoinPage from '../inscription/JoinPage'
import BottomNav from './BottomNav'
import { progress, useChallenges, useMyEntries, useUnreadCount, type EventInfo, type ParticipantCtx } from './data'

/** Cadre de tout ce qui se passe sous /e/:eventId : inscription tant qu'on n'est pas inscrit, sinon l'app avec sa navigation. */
export default function ParticipantArea() {
  const { eventId } = useParams<{ eventId: string }>()
  const { t } = useI18n()
  const { session, me, loading } = useMe(eventId)
  const viewingRules = !!useMatch('/e/:eventId/reglement')

  const event = useQuery({
    queryKey: ['event', eventId],
    queryFn: async (): Promise<EventInfo | null> => {
      const { data, error } = await supabase
        .from('events').select('id, name, status, ends_at, message').eq('id', eventId!).maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!eventId,
  })

  if (loading || event.isLoading) return <main className="page"><p role="status">{t('loading')}</p></main>
  // Une erreur de connexion (clé invalide, réseau) ne doit pas se faire passer pour un événement fermé.
  if (event.isError) {
    console.error('Lecture de l’événement impossible', event.error)
    return <main className="page"><Header subtitle={false} /><p role="alert" className="err">{t('netError')}</p></main>
  }
  if (!event.data) return <main className="page"><Header subtitle={false} /><p role="alert">{t('eventNotFound')}</p></main>

  // Le règlement se lit avant l'inscription (lien de la case à cocher).
  if (!session || !me) {
    return (
      <main className="page">
        <Header />
        {viewingRules ? <Outlet /> : <JoinPage event={event.data} userId={session?.user.id} />}
      </main>
    )
  }
  const ctx: ParticipantCtx = { event: event.data, me }
  return <Shell ctx={ctx} />
}

function Shell({ ctx }: { ctx: ParticipantCtx }) {
  const challenges = useChallenges(ctx.event.id)
  const entries = useMyEntries(ctx.me.id)
  const unread = useUnreadCount(ctx.me.id)
  const total = challenges.data?.length ?? 0
  const left = Math.max(0, total - progress(entries.data ?? []).sent.size)
  return (
    <>
      <main className="page with-nav">
        <Header subtitle={false} />
        <Outlet context={ctx} />
      </main>
      <BottomNav eventId={ctx.event.id} left={left} unread={unread.data ?? 0} />
    </>
  )
}
