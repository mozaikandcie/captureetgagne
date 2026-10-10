import { useState } from 'react'
import { useI18n } from '../../i18n'
import { posterUrl } from '../jury/posters'
import { useCountdown } from './Countdown'
import type { EventInfo } from './data'

/** Carte rouge de l'événement : nom, date, lieu, décompte, message et lots. */
export default function EventCard({ event }: { event: EventInfo }) {
  const { t } = useI18n()
  const cd = useCountdown(event.status === 'closed' ? null : event.ends_at)
  const poster = posterUrl(event.poster_path)
  const [zoom, setZoom] = useState(false)
  return (
    <article className="evt" aria-label={t('live')}>
      <div className="in">
        <span className="lab">{t('live')}</span>
        <h2>{event.name}</h2>
        <div className="facts">
          {event.date_label && <span>📅 {event.date_label}</span>}
          {event.place && <span>📍 {event.place}</span>}
          {cd && <span>⏳ {cd.text}</span>}
        </div>
        {event.message && <p>{event.message}</p>}
        {event.prizes && <span className="lot">🏆 {event.prizes}</span>}
      </div>
      {poster && (
        <button type="button" className="pwrap" aria-label={t('zoom')} onClick={() => setZoom(true)}>
          <img className="poster" src={poster} alt="" /><span className="zoom">{t('zoom')}</span>
        </button>
      )}
      {zoom && poster && (
        <div className="lb" role="dialog" aria-modal="true" aria-label={event.name} onClick={() => setZoom(false)}>
          <div className="lb-in"><img src={poster} alt={event.name} /><button type="button" className="btn small ghost" onClick={() => setZoom(false)}>{t('close')}</button></div>
        </div>
      )}
    </article>
  )
}
