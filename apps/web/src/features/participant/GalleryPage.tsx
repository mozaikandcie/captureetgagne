import { useOutletContext } from 'react-router-dom'
import Favs from './Favs'
import type { ParticipantCtx } from './data'

/** Galerie : coups de cœur du jury en premier, puis les autres contenus validés. */
export default function GalleryPage() {
  const { event } = useOutletContext<ParticipantCtx>()
  return <Favs eventId={event.id} withAll />
}
