import { useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { localized } from '../../lib/me'
import { useI18n } from '../../i18n'
import UploadButton from '../envois/UploadButton'
import { useQueue } from '../envois/useQueue'
import { discard, retry } from '../envois/queue'
import { progress, useChallenges, useMyEntries, type ParticipantCtx } from '../participant/data'

type Json = Record<string, string> | null

/** Les défis : consigne, conseils, envois en cours et bouton d'envoi. */
export default function ChallengesPage() {
  const { event, me } = useOutletContext<ParticipantCtx>()
  const { t, lang } = useI18n()
  const qc = useQueryClient()
  const queue = useQueue()
  const challenges = useChallenges(event.id)
  const mine = useMyEntries(me.id)

  // Un envoi terminé rafraîchit les compteurs.
  useEffect(() => {
    const refresh = () => void qc.invalidateQueries({ queryKey: ['my-entries'] })
    window.addEventListener('cg-entry-sent', refresh)
    return () => window.removeEventListener('cg-entry-sent', refresh)
  }, [qc])

  if (challenges.isLoading) return <p role="status">{t('loading')}</p>
  if (challenges.isError) return <p role="alert" className="err">{t('netError')}</p>

  const list = challenges.data ?? []
  const { sent: sentSet } = progress(mine.data ?? [])
  const typeLabel = { photo: t('tPhoto'), video: t('tVideo'), both: t('tBoth') }

  return (
    <section className="box">
      <div className="row">
        <h2 className="grow">{t('defisTitle')}</h2>
        <span className="pill">{sentSet.size} / {list.length}</span>
      </div>
      <p className="help">{t('defisNote')}</p>
      <ol className="defis">
        {list.map((c, i) => {
          const sent = (mine.data ?? []).filter((e) => e.challenge_id === c.id && e.status !== 'rejected').length
          const waiting = queue.filter((q) => q.challengeId === c.id)
          const full = sent + waiting.length >= 2
          const tip = localized(c.tip as Json, lang)
          const culture = localized(c.culture as Json, lang)
          return (
            <li key={c.id} className="defi">
              <span className={sent > 0 ? 'num done' : 'num'} aria-hidden="true">{sent > 0 ? '✓' : i + 1}</span>
              <div>
                <h3>{localized(c.title as Json, lang)}</h3>
                <p>{localized(c.hint as Json, lang)}</p>
                <p className="help">{typeLabel[c.kind as keyof typeof typeLabel]} · {t('sentCount', { n: sent })}</p>
              </div>
              <div className="actions">
                {(tip || culture) && (
                  <details>
                    <summary>💡 {t('tipsCult')}</summary>
                    {tip && <p>{tip}</p>}
                    {culture && <p className="help">{culture}</p>}
                  </details>
                )}
                {waiting.map((q) => (
                  <div key={q.id} role="status" className="help">
                    {q.status === 'error' ? (
                      <>
                        <span className="err">{t(q.error ?? 'uploadFailed')}</span>{' '}
                        {q.detail && <small className="detail">{q.detail}</small>}{' '}
                        <button type="button" className="link" onClick={() => retry(q.id)}>{t('retry')}</button>{' '}
                        <button type="button" className="link" onClick={() => void discard(q.id)}>{t('dismiss')}</button>
                      </>
                    ) : (
                      <>
                        <progress value={q.progress} max={1} aria-label={t('uploading')} />
                        {q.status === 'uploading' ? t('uploading') : t('queued')}
                      </>
                    )}
                  </div>
                ))}
                <UploadButton eventId={event.id} participantId={me.id} challengeId={c.id}
                  kind={c.kind as 'photo' | 'video' | 'both'} disabled={full} />
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
