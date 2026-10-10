import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { localized } from '../../lib/me'
import { useI18n } from '../../i18n'
import StaffGuard, { spacePath } from '../moderation/StaffGuard'
import { useModerationData } from '../moderation/data'
import { useQr } from '../outils/useQr'

const SLIDE_MS = 6000

/** Mur en direct : /jury/:eventId/mur. Les contenus validés défilent, coups de cœur en premier. */
export default function WallPage() {
  const { eventId } = useParams<{ eventId: string }>()
  return <StaffGuard eventId={eventId!}>{(staff) => <Wall eventId={eventId!} home={spacePath(staff.role, eventId!)} />}</StaffGuard>
}

function Wall({ eventId, home }: { eventId: string; home: string }) {
  const { t, lang } = useI18n()
  const { challenges, entries, loading } = useModerationData(eventId)
  const [index, setIndex] = useState(0)
  const qr = useQr(`${location.origin}/e/${eventId}`, 300)

  const info = useQuery({
    queryKey: ['wall-info', eventId],
    refetchInterval: 30000,
    queryFn: async () => {
      const [event, count] = await Promise.all([
        supabase.from('events').select('name, place').eq('id', eventId).single(),
        supabase.from('participants').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
      ])
      if (event.error) throw event.error
      return { name: [event.data.name, event.data.place].filter(Boolean).join(' · '), participants: count.count ?? 0 }
    },
  })

  const ok = entries
    .filter((e) => e.status === 'ok' && e.url)
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.createdAt.localeCompare(b.createdAt))

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => i + 1), SLIDE_MS)
    return () => clearInterval(timer)
  }, [])

  const current = ok.length ? ok[index % ok.length] : undefined
  const challenge = current ? localized(challenges.find((c) => c.id === current.challengeId)?.title, lang) : ''

  return (
    <div className="wall" role="region" aria-label={t('launchWall')}>
      <div className="w-stage" aria-live="off">
        {loading ? <p role="status">{t('loading')}</p>
          : !current ? <p className="w-empty">{t('wallEmpty')}</p>
          : current.kind === 'photo'
            ? <img key={current.id} className="w-media" src={current.url!} alt={challenge} />
            : <video key={current.id} className="w-media" src={current.url!} autoPlay muted playsInline loop />}
        {current && (
          <p className="w-cap">
            <b>{current.participantName}</b> {challenge}
            {current.favorite && <span className="w-fav"> · {t('wallFav')}</span>}
          </p>
        )}
      </div>
      <aside className="w-side">
        <h1>{info.data?.name}</h1>
        {qr && <img className="w-qr" src={qr} alt={t('wallScan')} />}
        <p>{t('wallScan')}</p>
        <p className="help">{t('wallParticipants', { n: info.data?.participants ?? 0 })} · {t('wallContents', { n: ok.length })}</p>
        <Link to={home} className="link">{t('close')}</Link>
      </aside>
    </div>
  )
}
