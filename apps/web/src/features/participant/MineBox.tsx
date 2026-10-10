import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { localized } from '../../lib/me'
import { useI18n } from '../../i18n'
import { useChallenges, useMyEntries, type ParticipantCtx } from './data'

const STATUS = { pending: ['stPending', 'wait'], ok: ['stOk', 'ok'], rejected: ['stRejected', 'bad'] } as const

/** « Mes contenus » : envois, statut, note et commentaires du jury, retrait (fichier puis ligne). */
export default function MineBox({ ctx }: { ctx: ParticipantCtx }) {
  const { t, lang } = useI18n()
  const qc = useQueryClient()
  const entries = useMyEntries(ctx.me.id)
  const challenges = useChallenges(ctx.event.id)
  const [ask, setAsk] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const title = (id: string) => localized(challenges.data?.find((c) => c.id === id)?.title as Record<string, string> | undefined, lang)

  async function remove(id: string) {
    setError(null)
    const { data } = await supabase.from('entries').select('storage_path').eq('id', id).maybeSingle()
    // Fichier d'abord : si la suppression de la ligne échouait ensuite, le contenu ne serait plus lisible mais resterait listé.
    const file = data ? await supabase.storage.from('media').remove([data.storage_path]) : { error: null }
    const row = file.error ? { error: file.error } : await supabase.from('entries').delete().eq('id', id)
    if (row.error) return setError(t('removeFailed'))
    setAsk(null)
    await qc.invalidateQueries({ queryKey: ['my-entries'] })
  }

  const list = entries.data ?? []
  return (
    <section className="box">
      <h2>{t('mine')}</h2>
      <p className="help">{t('mineNote')}</p>
      {error && <p role="alert" className="err">{error}</p>}
      {list.length === 0 && <p className="empty">{t('myContentsEmpty')}</p>}
      <ul className="mine">
        {list.map((e) => {
          const [label, tone] = STATUS[e.status]
          return (
            <li key={e.id}>
              <div className="m">
                {e.url && (e.kind === 'photo' ? <img src={e.url} alt={title(e.challenge_id)} loading="lazy" /> : <video src={e.url} muted playsInline preload="metadata" />)}
              </div>
              <div className="info">
                <div className="row">
                  <b className="grow">{title(e.challenge_id)}</b>
                  <span className={`pill ${tone}`}>{t(label)}</span>
                  {e.favorite && <span className="pill ok">{t('favBadge')}</span>}
                </div>
                <span className="help">
                  {e.note !== null ? t('juryNoteLine', { n: e.note.toFixed(1).replace('.', ',') }) : e.status === 'ok' ? t('notScored') : ''}
                </span>
                {e.status === 'rejected' && e.reject_reason && <div className="com err">{e.reject_reason}</div>}
                {e.comments.map((c, i) => <div key={i} className="com"><b>{t('juryNote')}</b>{c}</div>)}
                {ask === e.id ? (
                  <div className="row">
                    <span className="help err">{t('withdrawAsk')}</span>
                    <button type="button" className="btn ghost small bad" onClick={() => void remove(e.id)}>{t('withdrawYes')}</button>
                    <button type="button" className="btn ghost small" onClick={() => setAsk(null)}>{t('cancel')}</button>
                  </div>
                ) : (
                  <div className="row"><button type="button" className="btn ghost small" onClick={() => setAsk(e.id)}>{t('removeIt')}</button></div>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
