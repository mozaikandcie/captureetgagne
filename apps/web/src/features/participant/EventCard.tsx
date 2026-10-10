import { useI18n } from '../../i18n'
import { useCountdown } from './Countdown'
import type { EventInfo } from './data'

/** Carte rouge de l'événement : nom, date, lieu, décompte, message et lots. */
export default function EventCard({ event }: { event: EventInfo }) {
  const { t } = useI18n()
  const cd = useCountdown(event.status === 'closed' ? null : event.ends_at)
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
    </article>
  )
}
