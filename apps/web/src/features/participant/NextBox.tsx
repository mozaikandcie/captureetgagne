import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { localized } from '../../lib/me'
import { progress, useChallenges, useMyEntries, type ParticipantCtx } from './data'

/** Carte « Prochain défi » (ou « Bravo ! » quand tout est relevé, ou « Concours terminé »). */
export default function NextBox({ ctx }: { ctx: ParticipantCtx }) {
  const { t, lang } = useI18n()
  const challenges = useChallenges(ctx.event.id)
  const entries = useMyEntries(ctx.me.id)
  const list = challenges.data ?? []
  const { sent } = progress(entries.data ?? [])
  const index = list.findIndex((c) => !sent.has(c.id))
  const next = index >= 0 ? list[index] : undefined
  const closed = ctx.event.status === 'closed' || (!!ctx.event.ends_at && new Date(ctx.event.ends_at).getTime() <= Date.now())
  const base = `/e/${ctx.event.id}`

  if (closed) {
    return (
      <section className="box nextbox">
        <div><span className="lab">{t('ended')}</span><h2>{t('thanks')}</h2><p>{t('delib')}</p></div>
        <Link className="btn" to={`${base}/moi`}>{t('myRes')}</Link>
      </section>
    )
  }
  if (next) {
    return (
      <section className="box nextbox">
        <div>
          <span className="lab">{t('nextDefi', { i: index + 1, n: list.length })}</span>
          <h2>{localized(next.title as Record<string, string>, lang)}</h2>
          <p>{localized(next.hint as Record<string, string>, lang)}</p>
        </div>
        <Link className="btn" to={`${base}/defis`}>{t('doIt')}</Link>
      </section>
    )
  }
  if (!list.length) return null
  return (
    <section className="box nextbox">
      <div>
        <span className="lab">{t('bravo')}</span><h2>{t('allDone')}</h2>
        <p>{ctx.event.public_vote ? t('voteNow') : t('juryLooks')}</p>
      </div>
      {ctx.event.public_vote && <Link className="btn" to={`${base}/galerie`}>{t('vote')}</Link>}
    </section>
  )
}
