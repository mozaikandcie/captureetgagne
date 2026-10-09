import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { applyScale, applyTheme, loadScale, loadTheme, nextScale, nextTheme } from './prefs'

const THEME_LABEL = { auto: 'themeAuto', light: 'themeLight', dark: 'themeDark' } as const
const THEME_ICON = { auto: '◐', light: '☀', dark: '☾' } as const

/** Cadre commun : lien d'évitement, boutons « A+ » et thème, pied de page légal. */
export default function Layout() {
  const { t } = useI18n()
  const eventId = /^\/(?:e|jury)\/([^/]+)/.exec(useLocation().pathname)?.[1]
  const [scale, setScale] = useState(loadScale)
  const [theme, setTheme] = useState(loadTheme)

  useEffect(() => applyScale(scale), [scale])
  useEffect(() => applyTheme(theme), [theme])

  return (
    <>
      <a className="skip" href="#main">{t('skipToContent')}</a>
      <div className="prefs">
        <button type="button" className="pref" onClick={() => setScale(nextScale(scale))}
          aria-label={t('textSize', { n: Math.round(scale * 100) })}>
          {t('textSizeBtn')}
        </button>
        <button type="button" className="pref" onClick={() => setTheme(nextTheme(theme))}
          aria-label={`${t('themeBtn')} : ${t(THEME_LABEL[theme])}`}>
          <span aria-hidden="true">{THEME_ICON[theme]}</span>
        </button>
      </div>
      <div id="main" tabIndex={-1}><Outlet /></div>
      <footer className="foot">
        {eventId && <Link to={`/e/${eventId}/reglement`}>{t('footRules')}</Link>}
        <Link to="/donnees-personnelles">{t('footData')}</Link>
      </footer>
    </>
  )
}
