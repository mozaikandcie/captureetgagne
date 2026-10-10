import { useLocation, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n'

const KEY = 'cg-last-event'

/** Mémorise l'événement consulté, pour savoir où revenir quand on arrive sur une page sans historique (lien ouvert directement). */
export function rememberEvent(eventId: string | undefined) {
  if (!eventId) return
  try { sessionStorage.setItem(KEY, eventId) } catch { /* ignoré */ }
}

/**
 * Retour à la page précédente. Sans historique (page ouverte directement, nouvel onglet),
 * retombe sur la page de l'événement mémorisé, sinon sur l'accueil.
 */
export default function BackLink({ fallback }: { fallback?: string }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const hasHistory = location.key !== 'default'

  function back() {
    if (hasHistory) return navigate(-1)
    let last: string | null = null
    try { last = sessionStorage.getItem(KEY) } catch { /* ignoré */ }
    navigate(fallback ?? (last ? `/e/${last}` : '/'), { replace: true })
  }

  return <button type="button" className="btn ghost small" onClick={back}>← {t('back')}</button>
}
