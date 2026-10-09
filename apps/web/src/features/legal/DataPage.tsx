import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n'

/** Page « Données personnelles » (RGPD). Durées de conservation : à confirmer par le bureau. */
export default function DataPage() {
  const { t } = useI18n()
  const sections = [
    ['dataWhatTitle', 'dataWhat'],
    ['dataWhyTitle', 'dataWhy'],
    ['dataKeepTitle', 'dataKeep'],
    ['dataRightsTitle', 'dataRights'],
  ] as const
  return (
    <main className="page">
      <h1>{t('dataTitle')}</h1>
      <p>{t('dataWho')}</p>
      {sections.map(([title, body]) => (
        <section key={title}><h2>{t(title)}</h2><p>{t(body)}</p></section>
      ))}
      <p>{t('dataHost')}</p>
      <p><Link to="/">{t('back')}</Link></p>
    </main>
  )
}
