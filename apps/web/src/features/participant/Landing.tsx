import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n'
import JoinPage from '../inscription/JoinPage'
import Onboarding from '../inscription/Onboarding'
import EventCard from './EventCard'
import RulesBox from './RulesBox'
import type { EventInfo } from './data'

/** Page d'accueil d'un visiteur non inscrit (prototype) : événement, « Rejoindre le concours », règlement, espace organisation. */
export default function Landing({ event, userId }: { event: EventInfo; userId?: string }) {
  const { t } = useI18n()
  const [intro, setIntro] = useState(false)

  // Le champ téléphone doit être visible tout de suite : la présentation en 3 étapes s'ouvre après l'inscription
  // (sur l'accueil), ou à la demande avec « Revoir la présentation ».

  return (
    <>
      <EventCard event={event} />
      <JoinPage event={event} userId={userId} />
      <RulesBox eventId={event.id} />
      <p className="orglink">
        <button type="button" className="link" onClick={() => setIntro(true)}>{t('obAgain')}</button>
        {' · '}
        <Link to={`/jury/${event.id}`}>{t('juryLink')}</Link>
        {' · '}
        <Link to={`/organisation/${event.id}`}>{t('orgLink')}</Link>
      </p>
      {intro && <Onboarding onClose={() => setIntro(false)} />}
    </>
  )
}
