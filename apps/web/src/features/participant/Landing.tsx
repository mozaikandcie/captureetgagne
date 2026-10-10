import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n'
import JoinPage from '../inscription/JoinPage'
import Onboarding, { hasSeenOnboarding } from '../inscription/Onboarding'
import EventCard from './EventCard'
import RulesBox from './RulesBox'
import type { EventInfo } from './data'

/** Page d'accueil d'un visiteur non inscrit (prototype) : événement, « Rejoindre le concours », règlement, espace organisation. */
export default function Landing({ event, userId, splashDone }: { event: EventInfo; userId?: string; splashDone: boolean }) {
  const { t } = useI18n()
  const [intro, setIntro] = useState(false)

  // Les écrans de bienvenue passent après l'écran d'ouverture, une seule fois par appareil.
  useEffect(() => {
    if (splashDone && !hasSeenOnboarding()) setIntro(true)
  }, [splashDone])

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
