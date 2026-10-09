import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { localized } from '../../lib/me'
import { scoringDone } from '../../lib/score'
import { useI18n } from '../../i18n'
import StaffGuard from '../moderation/StaffGuard'
import { buildSteps, type CeremonyEntry, type Step } from './steps'
import { confetti } from './confetti'

/** Remise des prix : /jury/:eventId/remise. Bloquée tant que le classement est provisoire, sauf « lancer quand même ». */
export default function CeremonyPage() {
  const { eventId } = useParams<{ eventId: string }>()
  return <StaffGuard eventId={eventId!}>{() => <Ceremony eventId={eventId!} />}</StaffGuard>
}

type Json = Record<string, string> | null

function useCeremonyData(eventId: string) {
  return useQuery({
    queryKey: ['ceremony', eventId],
    queryFn: async () => {
      const [event, challenges, participants, entries, scores, jurors] = await Promise.all([
        supabase.from('events').select('name').eq('id', eventId).single(),
        supabase.from('challenges').select('id, title').eq('event_id', eventId).order('position'),
        supabase.from('participants').select('id, display_name').eq('event_id', eventId),
        supabase.from('entries').select('id, participant_id, challenge_id, kind, status, validated_at, storage_path').eq('event_id', eventId),
        supabase.from('scores').select('entry_id, juror_id, respect, quality, originality'),
        supabase.from('staff').select('user_id').eq('event_id', eventId).eq('role', 'juror'),
      ])
      for (const r of [event, challenges, participants, entries, scores, jurors]) if (r.error) throw r.error

      const ok = entries.data!.filter((e) => e.status === 'ok')
      const signed = await supabase.storage.from('media').createSignedUrls(ok.map((e) => e.storage_path), 6 * 3600)
      const urls = new Map(signed.data?.map((u) => [u.path, u.signedUrl]))

      const byEntry = new Map<string, CeremonyEntry['scores']>()
      for (const s of scores.data!) {
        const map = byEntry.get(s.entry_id) ?? {}
        map[s.juror_id] = { respect: s.respect, quality: s.quality, originality: s.originality }
        byEntry.set(s.entry_id, map)
      }

      const list: CeremonyEntry[] = entries.data!.map((e) => ({
        id: e.id,
        participantId: e.participant_id,
        challengeId: e.challenge_id,
        status: e.status as CeremonyEntry['status'],
        kind: e.kind as CeremonyEntry['kind'],
        url: urls.get(e.storage_path) ?? null,
        validatedAt: e.validated_at ? new Date(e.validated_at).getTime() : 0,
        scores: byEntry.get(e.id) ?? {},
      }))
      return {
        eventName: event.data!.name,
        challenges: challenges.data!.map((c) => ({ id: c.id, title: c.title as Json })),
        participants: participants.data!.map((p) => ({ id: p.id, name: p.display_name })),
        entries: list,
        jurorCount: jurors.data!.length,
      }
    },
  })
}

function Ceremony({ eventId }: { eventId: string }) {
  const { t } = useI18n()
  const data = useCeremonyData(eventId)
  const [forced, setForced] = useState(false)

  if (data.isLoading) return <main className="page"><p role="status">{t('loading')}</p></main>
  if (!data.data) return <main className="page"><p role="alert" className="err">{t('netError')}</p></main>

  const { entries, jurorCount } = data.data
  if (!scoringDone(entries, jurorCount) && !forced) {
    return (
      <main className="page">
        <h1>{t('cerTitle')}</h1>
        <p role="alert" className="err">{t('cerBlocked')}</p>
        <button type="button" className="btn" onClick={() => setForced(true)}>{t('cerForce')}</button>
        <p><Link to={`/jury/${eventId}`}>{t('back')}</Link></p>
      </main>
    )
  }
  return <Show eventId={eventId} data={data.data} />
}

function Show({ eventId, data }: { eventId: string; data: NonNullable<ReturnType<typeof useCeremonyData>['data']> }) {
  const { t, lang } = useI18n()
  const steps = buildSteps(
    data.challenges.map((c) => c.id), data.participants.map((p) => p.id), data.entries, data.jurorCount)
  const [i, setI] = useState(0)
  const [count, setCount] = useState<number | null>(null) // décompte du tambour ; null = révélé
  const canvas = useRef<HTMLCanvasElement>(null)
  const step = steps[i]
  const suspense = step.type === 'prize' || step.type === 'podium'

  // Décompte 3-2-1 avant chaque révélation (sauté si les animations sont réduites).
  useEffect(() => {
    if (!suspense || matchMedia('(prefers-reduced-motion: reduce)').matches) return setCount(null)
    setCount(3)
    const timer = setInterval(() => setCount((c) => (c === null || c <= 1 ? (clearInterval(timer), null) : c - 1)), 800)
    return () => clearInterval(timer)
  }, [i, suspense])

  const revealed = !suspense || count === null
  const winner = step.type === 'podium' && step.rank === 1
  useEffect(() => {
    if (!revealed || !winner || !canvas.current) return
    return confetti(canvas.current, 6000)
  }, [revealed, winner])

  const name = (id: string) => data.participants.find((p) => p.id === id)?.name ?? ''
  const title = (id: string) => localized(data.challenges.find((c) => c.id === id)?.title, lang)
  const last = i === steps.length - 1

  return (
    <div className="cer" role="region" aria-label={t('cerTitle')}>
      <canvas ref={canvas} className="cer-confetti" aria-hidden="true" />
      <div className="cer-in" aria-live="polite">{renderStep(step, revealed, count)}</div>
      <nav className="cer-nav">
        <button type="button" className="btn ghost" disabled={i === 0} onClick={() => setI(i - 1)}>{t('cerPrev')}</button>
        <span>{t('cerOf', { i: i + 1, n: steps.length })}</span>
        {last
          ? <Link className="btn" to={`/jury/${eventId}`}>{t('cerFinish')}</Link>
          : <button type="button" className="btn" onClick={() => setI(i + 1)}>{t('cerNext')}</button>}
      </nav>
    </div>
  )

  function media(e?: CeremonyEntry) {
    if (!e?.url) return null
    return e.kind === 'photo'
      ? <img className="cer-media" src={e.url} alt="" />
      : <video className="cer-media" src={e.url} autoPlay muted playsInline loop />
  }

  function renderStep(s: Step, shown: boolean, n: number | null) {
    if (s.type === 'intro') return (
      <>
        <p className="cer-lab">{data.eventName}</p>
        <p className="cer-big">{t('cerTitle')}</p>
        <p className="cer-sub">Capture et Gagne · Ambyans Twopikal</p>
      </>
    )
    if (s.type === 'end') return (
      <>
        <p className="cer-big">{t('cerThanks')}</p>
        <p className="cer-sub">{t('wallStats', { p: data.participants.length, n: data.entries.filter((e) => e.status === 'ok').length })}</p>
        <p className="cer-sub">{t('cerSee')}</p>
      </>
    )
    const label = s.type === 'prize' ? t('cerPrize') : s.rank === 1 ? t('cerPlace1') : t('cerPlaceN', { n: s.rank })
    const sub = s.type === 'prize' ? title(s.challengeId) : ''
    if (!shown) return (
      <>
        <p className="cer-lab">{label}</p>
        {sub && <p className="cer-sub">{sub}</p>}
        <p className="cer-drum" aria-hidden="true">{n}</p>
      </>
    )
    const who = s.type === 'prize' ? name(s.entry.participantId) : name(s.row.participantId)
    const detail = s.type === 'prize'
      ? t('cerNoteOf', { n: s.note.toFixed(1).replace('.', ',') })
      : t('cerPoints', { s: s.row.score.toFixed(2).replace('.', ','), d: s.row.done })
    return (
      <>
        <p className="cer-lab">{label}</p>
        {sub && <p className="cer-sub">{sub}</p>}
        {media(s.entry)}
        <p className="cer-big">{s.type === 'podium' && s.rank === 1 ? '🏆 ' : ''}{who}</p>
        <p className="cer-sub">{detail}</p>
      </>
    )
  }
}
