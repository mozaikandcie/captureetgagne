import { useI18n } from '../i18n'
import { useInstall } from '../lib/install'

/** « Installer l'application » : bouton sur Android et ordinateur, mode d'emploi sur iPhone. Rien si déjà installée. */
export default function InstallBox() {
  const { t } = useI18n()
  const { installed, canPrompt, ios, install } = useInstall()
  if (installed || (!canPrompt && !ios)) return null
  return (
    <section className="box">
      <h2>{t('installTitle')}</h2>
      <p className="help">{t('installHelp')}</p>
      {canPrompt && <button type="button" className="btn" onClick={() => void install()}>{t('installBtn')}</button>}
      {!canPrompt && ios && <p className="help">{t('installIos')}</p>}
    </section>
  )
}
