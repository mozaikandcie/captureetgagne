import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { localized, useMe } from '../../lib/me'
import { useI18n } from '../../i18n'
import UploadButton from '../envois/UploadButton'
import { useQueue } from '../envois/useQueue'
import { discard, retry } from '../envois/queue'

type Json = Record<string, string> | null

export default function ChallengesPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const { t, lang } = useI18n()
  const { me, loading } = useMe(eventId)
  const qc = useQueryClient()
  const queue = useQueue()

  const challenges = useQuery({
    queryKey: ['challenges', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select('id, position, title, hint, tip, culture, kind')
        .eq('event_id', eventId!)
        .order('position')
      if (error) throw error
      return data
    },
    enabled: !!eventId,
  })

  const mine = useQuery({
    queryKey: ['my-entries', me?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entries')
        .select('id, challenge_id, status')
        .eq('participant_id', me!.id)
      if (error) throw error
      return data
    },
    enabled: !!me,
  })

  // Un envoi terminé rafraîchit les compteurs.
  useEffect(() => {
    const refresh = () => void qc.invalidateQueries({ queryKey: ['my-entries'] })
    window.addEventListener('cg-entry-sent', refresh)
    return () => window.removeEventListener('cg-entry-sent', refresh)
  }, [qc])

  if (loading || challenges.isLoading) return <main className="page"><p role="status">{t('loading')}</p></main>
  if (!me) return <main className="page"><p role="alert">{t('eventNotFound')}</p></main>

  const typeLabel = { photo: t('tPhoto'), video: t('tVideo'), both: t('tBoth') }

  return (
    <main className="page">
      <h1>{t('defisTitle')}</h1>
      <p className="help">{t('defisNote')}</p>
      <p><Link to={`/e/${eventId}/contenus`}>{t('mine')}</Link> · <Link to={`/e/${eventId}/notifications`}>{t('notifs')}</Link></p>
      <ul className="cards">
        {challenges.data?.map((c) => {
          const sent = (mine.data ?? []).filter((e) => e.challenge_id === c.id && e.status !== 'rejected').length
          const waiting = queue.filter((q) => q.challengeId === c.id)
          const full = sent + waiting.length >= 2
          const tip = localized(c.tip as Json, lang)
          const culture = localized(c.culture as Json, lang)
          return (
            <li key={c.id} className="card">
              <h2>{localized(c.title as Json, lang)}</h2>
              <p>{localized(c.hint as Json, lang)}</p>
              <p className="help">{typeLabel[c.kind as keyof typeof typeLabel]} · {t('sentCount', { n: sent })}</p>
              {(tip || culture) && (
                <details>
                  <summary>{t('tipsCult')}</summary>
                  {tip && <p>{tip}</p>}
                  {culture && <p>{culture}</p>}
                </details>
              )}
              {waiting.map((q) => (
                <div key={q.id} role="status" className="help">
                  {q.status === 'error' ? (
                    <>
                      <span className="err">{t(q.error ?? 'uploadFailed')}</span>{' '}
                      <button type="button" className="link" onClick={() => retry(q.id)}>{t('retry')}</button>
                      <button type="button" className="link" onClick={() => void discard(q.id)}>{t('dismiss')}</button>
                    </>
                  ) : (
                    <>
                      <progress value={q.progress} max={1} aria-label={t('uploading')} />{' '}
                      {q.status === 'uploading' ? t('uploading') : t('queued')}
                    </>
                  )}
                </div>
              ))}
              <UploadButton eventId={eventId!} participantId={me.id} challengeId={c.id}
                kind={c.kind as 'photo' | 'video' | 'both'} disabled={full} />
            </li>
          )
        })}
      </ul>
    </main>
  )
}
