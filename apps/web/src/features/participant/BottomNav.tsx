import { NavLink } from 'react-router-dom'
import { useI18n } from '../../i18n'

/** Navigation du bas (Accueil, Défis, Galerie, Moi). Le badge des défis compte ceux qu'il reste à relever. */
export default function BottomNav({ eventId, left, unread }: { eventId: string; left: number; unread: number }) {
  const { t } = useI18n()
  const items = [
    { to: `/e/${eventId}`, end: true, icon: '🏠', label: t('navHome'), badge: 0 },
    { to: `/e/${eventId}/defis`, end: false, icon: '🎯', label: t('navDefis'), badge: left },
    { to: `/e/${eventId}/galerie`, end: false, icon: '🖼️', label: t('navGal'), badge: 0 },
    { to: `/e/${eventId}/moi`, end: false, icon: '👤', label: t('navMoi'), badge: unread },
  ]
  return (
    <nav className="pnav" aria-label={t('navLabel')}>
      {items.map((i) => (
        <NavLink key={i.to} to={i.to} end={i.end}>
          <span className="ico" aria-hidden="true">{i.icon}</span>
          <span>{i.label}</span>
          {i.badge > 0 && <span className="badge" aria-label={String(i.badge)}>{i.badge}</span>}
        </NavLink>
      ))}
    </nav>
  )
}
