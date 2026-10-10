import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import Onboarding, { hasSeenOnboarding } from '../inscription/Onboarding'
import EventCard from './EventCard'
import Favs from './Favs'
import MyBox from './MyBox'
import NextBox from './NextBox'
import type { ParticipantCtx } from './data'

/** Accueil : carte de l'événement, prochain défi, coups de cœur du jury, carte « Bonjour ». */
export default function HomePage() {
  const ctx = useOutletContext<ParticipantCtx>()
  const [intro, setIntro] = useState(false)

  // Les écrans de bienvenue passent après l'écran d'ouverture, une seule fois par appareil.
  useEffect(() => {
    if (ctx.splashDone && !hasSeenOnboarding()) setIntro(true)
  }, [ctx.splashDone])

  return (
    <>
      <EventCard event={ctx.event} />
      <NextBox ctx={ctx} />
      <Favs eventId={ctx.event.id} />
      <MyBox ctx={ctx} />
      {intro && <Onboarding onClose={() => setIntro(false)} />}
    </>
  )
}
