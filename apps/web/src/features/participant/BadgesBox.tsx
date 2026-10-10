import { useI18n } from '../../i18n'
import { BADGES } from './badges'
import { useMyBadges } from './data'

/** « Mes badges » : les 7 badges, ceux obtenus en couleur, les autres grisés. */
export default function BadgesBox({ participantId }: { participantId: string }) {
  const { t } = useI18n()
  const badges = useMyBadges(participantId)
  const got = badges.data ?? new Set<string>()
  return (
    <section className="box">
      <div className="row">
        <h2 className="grow">{t('badges')}</h2>
        <span className="pill">{t('badgeCount', { n: got.size })}</span>
      </div>
      <ul className="badges">
        {BADGES.map((b) => (
          <li key={b.id} className={got.has(b.id) ? 'badge2' : 'badge2 off'}>
            <span className="bi" aria-hidden="true">{b.icon}</span>
            <b>{t(b.name)}</b>
            <span>{t(b.desc)}</span>
            <span className="sr">{got.has(b.id) ? '✓' : ''}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
