import { LANGS, useI18n, type Lang } from '../i18n'
import { usePrefs } from '../features/accessibilite/usePrefs'

const THEME_LABEL = { auto: 'themeAuto', light: 'themeLight', dark: 'themeDark' } as const
const THEME_ICON = { auto: '◐', light: '☀️', dark: '🌙' } as const

/** En-tête : logo, titre, langue, taille du texte (« A+ ») et thème. */
export default function Header({ subtitle = true }: { subtitle?: boolean }) {
  const { t, lang, setLang } = useI18n()
  const { scale, theme, cycleScale, cycleTheme } = usePrefs()
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
        <label className="sr" htmlFor="lang">{t('langLabel')}</label>
        <select id="lang" className="langsel" value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
          {LANGS.map(([code, label]) => <option key={code} value={code}>🌐 {label}</option>)}
        </select>
        <button type="button" className="chipbtn" onClick={cycleScale}
          aria-label={t('textSize', { n: Math.round(scale * 100) })}>{t('textSizeBtn')}</button>
        <button type="button" className="chipbtn" onClick={cycleTheme}
          aria-label={`${t('themeBtn')} : ${t(THEME_LABEL[theme])}`}>
          <span aria-hidden="true">{THEME_ICON[theme]}</span>
        </button>
      </div>
    </header>
  )
}
