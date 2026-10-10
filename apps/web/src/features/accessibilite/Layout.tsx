import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useI18n } from '../../i18n'
import OfflineBanner from '../../components/OfflineBanner'
import { rememberEvent } from '../../components/BackLink'
import { applyScale, applyTheme, loadScale, loadTheme } from './prefs'

/** Cadre commun : réglages mémorisés appliqués dès l'ouverture, lien d'évitement, pied de page légal. */
export default function Layout() {
  const { t } = useI18n()
  const eventId = /^\/(?:e|jury)\/([^/]+)/.exec(useLocation().pathname)?.[1]

  useEffect(() => { rememberEvent(eventId) }, [eventId])

  useEffect(() => {
    applyScale(loadScale())
    applyTheme(loadTheme())
  }, [])

  return (
    <>
      <OfflineBanner />
      <a className="skip" href="#main">{t('skipToContent')}</a>
      <div id="main" tabIndex={-1}><Outlet /></div>
      <footer className="foot">
        {eventId && <Link to={`/e/${eventId}/reglement`}>{t('footRules')}</Link>}
        <Link to="/donnees-personnelles">{t('footData')}</Link>
      </footer>
    </>
  )
}
