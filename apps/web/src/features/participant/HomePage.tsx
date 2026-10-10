import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { localized } from '../../lib/me'
import Onboarding, { hasSeenOnboarding } from '../inscription/Onboarding'
import Countdown from './Countdown'
import { progress, useChallenges, useMyEntries, useUnreadCount, type ParticipantCtx } from './data'

/** Accueil : bonjour, progression, décompte, prochain défi. */
export default function HomePage() {
  const { event, me } = useOutletContext<ParticipantCtx>()
  const { t, lang } = useI18n()
  const [intro, setIntro] = useState(() => !hasSeenOnboarding())
  const challenges = useChallenges(event.id)
  const entries = useMyEntries(me.id)
  const unread = useUnreadCount(me.id)

  const list = challenges.data ?? []
  const { sent, ok } = progress(entries.data ?? [])
  const nextIndex = list.findIndex((c) => !sent.has(c.id))
  const next = nextIndex >= 0 ? list[nextIndex] : undefined
  const closed = event.status === 'closed'
  const pct = list.length ? Math.round((sent.size / list.length) * 100) : 0

  return (
    <>
      <span className="event-pill">{event.name}</span>

      <section className="box">
        <h2>{t('hello', { n: me.display_name.split(' ')[0] })}</h2>
        {event.message && <p>{event.message}</p>}
        {!closed && <Countdown endsAt={event.ends_at} />}
        {closed && <p className="pill bad" role="status">{t('endedT')}</p>}
        <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={list.length} aria-valuenow={sent.size}
          aria-label={t('count', { d: sent.size, n: list.length })}><i style={{ width: `${pct}%` }} /></div>
        <p className="help">
          {t('count', { d: sent.size, n: list.length })}
          {sent.size > 0 && <> · {t('homeValidated', { n: ok.size })}</>}
        </p>
        {unread.data ? <Link className="btn ghost small" to={`/e/${event.id}/notifications`}>🔔 {t('notifs')} · {t('meUnread', { n: unread.data })}</Link> : null}
      </section>

      {closed ? (
        <section className="box"><h2>{t('thanks')}</h2><p>{t('delib')}</p></section>
      ) : next ? (
        <section className="box">
          <p className="pill">{t('nextDefi', { i: nextIndex + 1, n: list.length })}</p>
          <h2>{localized(next.title as Record<string, string>, lang)}</h2>
          <p>{localized(next.hint as Record<string, string>, lang)}</p>
          <Link className="btn" to={`/e/${event.id}/defis`}>{t('doIt')}</Link>
        </section>
      ) : list.length > 0 ? (
        <section className="box">
          <h2>🎉 {t('bravo')}</h2>
          <p>{t('allDone')}</p>
          <p className="help">{t('juryLooks')}</p>
          <Link className="btn ghost" to={`/e/${event.id}/galerie`}>{t('navGal')}</Link>
        </section>
      ) : null}

      {intro && <Onboarding onClose={() => setIntro(false)} />}
    </>
  )
}
