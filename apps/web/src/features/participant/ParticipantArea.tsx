import { useState } from 'react'
import { Outlet, useMatch, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useMe } from '../../lib/me'
import { useI18n } from '../../i18n'
import Header from '../../components/Header'
import Splash, { splashSeen } from '../../components/Splash'
import Landing from './Landing'
import BottomNav from './BottomNav'
import { progress, useChallenges, useMyEntries, useUnreadCount, type EventInfo, type ParticipantCtx } from './data'

/** Cadre de tout ce qui se passe sous /e/:eventId : inscription tant qu'on n'est pas inscrit, sinon l'app avec sa navigation. */
export default function ParticipantArea() {
  const { eventId } = useParams<{ eventId: string }>()
  const { t } = useI18n()
  const { session, me, loading } = useMe(eventId)
  const viewingRules = !!useMatch('/e/:eventId/reglement')
  const [splashDone, setSplashDone] = useState(splashSeen)

  const event = useQuery({
    queryKey: ['event', eventId],
    queryFn: async (): Promise<EventInfo | null> => {
      const { data, error } = await supabase
        .from('events').select('id, name, status, ends_at, message, date_label, place, prizes, public_vote, poster_path').eq('id', eventId!).maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!eventId,
  })

  const splash = !splashDone ? <Splash onDone={() => setSplashDone(true)} /> : null
  if (loading || event.isLoading) return <main className="page">{splash}<p role="status">{t('loading')}</p></main>
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
        {splash}
        <Header />
        {viewingRules ? <Outlet /> : <Landing event={event.data} userId={session?.user.id} splashDone={splashDone} />}
      </main>
    )
  }
  const ctx: ParticipantCtx = { event: event.data, me, splashDone }
  return <Shell ctx={ctx} splash={splash} />
}

function Shell({ ctx, splash }: { ctx: ParticipantCtx; splash: React.ReactNode }) {
  const challenges = useChallenges(ctx.event.id)
  const entries = useMyEntries(ctx.me.id)
  const unread = useUnreadCount(ctx.me.id)
  const total = challenges.data?.length ?? 0
  const left = Math.max(0, total - progress(entries.data ?? []).sent.size)
  return (
    <>
      <main className="page with-nav">
        {splash}
        <Header />
        <Outlet context={ctx} />
      </main>
      <BottomNav eventId={ctx.event.id} left={left} unread={unread.data ?? 0} />
    </>
  )
}
