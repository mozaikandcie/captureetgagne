import { useI18n } from '../i18n'
import LangPicker from './LangPicker'
import { usePrefs } from '../features/accessibilite/usePrefs'

const THEME_LABEL = { auto: 'themeAuto', light: 'themeLight', dark: 'themeDark' } as const

/** En-tête : logo, titre, langue, taille du texte (« A+ ») et thème. */
export default function Header({ subtitle = true }: { subtitle?: boolean }) {
  const { t } = useI18n()
  const { scale, theme, cycleScale, cycleTheme } = usePrefs()
  // Affichage réel : le thème « auto » suit le réglage du téléphone.
  const dark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  return (
    <header className="hd">
      <div className="hd-brand">
        <img className="hd-logo" src="/logo.png" alt="" width="56" height="65" />
        <div>
          <h1>{t('t1')} <span className="and">{t('t2')}</span> {t('t3')}</h1>
          {subtitle && <p className="hd-sub">{t('sub')}</p>}
        </div>
      </div>
      <div className="hd-tools">
        <LangPicker />
        <button type="button" className="chipbtn" onClick={cycleScale}
          aria-label={t('textSize', { n: Math.round(scale * 100) })}>{t('textSizeBtn')}</button>
        <button type="button" className="chipbtn" onClick={cycleTheme}
          aria-label={`${t('themeBtn')} : ${t(THEME_LABEL[theme])}`}>
          {dark ? t('themeToLight') : t('themeToDark')}
        </button>
      </div>
    </header>
  )
}
