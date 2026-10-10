import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { localized } from '../../lib/me'
import { useI18n } from '../../i18n'
import { useChallenges, useGallery, useMyEntries, useMyVotes, useVoteCounts, type ParticipantCtx } from './data'

const MAX = 3

/** Prix du public : 3 votes, jamais pour soi (le serveur le garantit aussi). */
export default function VoteBox({ ctx }: { ctx: ParticipantCtx }) {
  const { t, lang } = useI18n()
  const qc = useQueryClient()
  const { event, me } = ctx
  const gallery = useGallery(event.id)
  const challenges = useChallenges(event.id)
  const mine = useMyEntries(me.id)
  const counts = useVoteCounts(event.id, true)
  const myVotes = useMyVotes(me.id, true)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)

  const mineIds = new Set((mine.data ?? []).map((e) => e.id))
  const voted = myVotes.data ?? new Set<string>()
  const left = MAX - voted.size
  const title = (id: string) => localized(challenges.data?.find((c) => c.id === id)?.title as Record<string, string> | undefined, lang)
  const list = (gallery.data ?? []).filter((e) => !mineIds.has(e.id))

  async function toggle(entryId: string) {
    setMessage(null)
    if (voted.has(entryId)) {
      const { error } = await supabase.from('votes').delete().eq('participant_id', me.id).eq('entry_id', entryId)
      if (error) return setMessage({ text: t('voteFailed'), error: true })
      setMessage({ text: t('voteRemoved'), error: false })
    } else {
      if (left <= 0) return setMessage({ text: t('voteMax'), error: true })
      const { error } = await supabase.from('votes').insert({ participant_id: me.id, entry_id: entryId })
      if (error) return setMessage({ text: error.message.includes('maximum') ? t('voteMax') : t('voteFailed'), error: true })
      setMessage({ text: t('voteSaved'), error: false })
    }
    await qc.invalidateQueries({ queryKey: ['my-votes', me.id] })
    await qc.invalidateQueries({ queryKey: ['vote-counts', event.id] })
  }

  return (
    <section className="box">
      <div className="row">
        <h2 className="grow">{t('public')}</h2>
        <span className="pill">{t('votesLeft', { n: left })}</span>
      </div>
      <p className="help">{t('voteNote')}</p>
      {message && <p role={message.error ? 'alert' : 'status'} className={message.error ? 'err' : 'ok'}>{message.text}</p>}
      {list.length === 0 ? <p className="empty">{t('voteEmpty')}</p> : (
        <ul className="favs">
          {list.map((e) => {
            const on = voted.has(e.id)
            return (
              <li key={e.id} className="fav">
                <div className="m">
                  {e.url && (e.kind === 'photo'
                    ? <img src={e.url} alt={title(e.challenge_id)} loading="lazy" />
                    : <video src={e.url} playsInline muted preload="metadata" />)}
                </div>
                <small>{title(e.challenge_id)}</small>
                <button type="button" className={on ? 'heart on' : 'heart'} aria-pressed={on} aria-label={t('voteHeart')}
                  disabled={!on && left <= 0} onClick={() => void toggle(e.id)}>
                  {on ? '♥' : '♡'} {counts.data?.get(e.id) ?? 0}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
