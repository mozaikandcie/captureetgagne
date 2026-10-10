import { useOutletContext } from 'react-router-dom'
import Favs from './Favs'
import VoteBox from './VoteBox'
import type { ParticipantCtx } from './data'

/** Galerie : coups de cœur du jury en premier, puis les autres contenus validés. */
export default function GalleryPage() {
  const ctx = useOutletContext<ParticipantCtx>()
  return (
    <>
      <Favs eventId={ctx.event.id} withAll={!ctx.event.public_vote} />
      {ctx.event.public_vote && <VoteBox ctx={ctx} />}
    </>
  )
}
