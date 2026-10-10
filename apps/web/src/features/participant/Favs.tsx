import { useI18n } from '../../i18n'
import { localized } from '../../lib/me'
import { useChallenges, useGallery } from './data'

/** « Les coups de cœur du jury » : photos et vidéos mises en avant, avec la pastille ★ Jury. */
export default function Favs({ eventId, withAll = false }: { eventId: string; withAll?: boolean }) {
  const { t, lang } = useI18n()
  const gallery = useGallery(eventId)
  const challenges = useChallenges(eventId)
  const title = (id: string) => localized(challenges.data?.find((c) => c.id === id)?.title as Record<string, string> | undefined, lang)
  const items = gallery.data ?? []
  const favs = items.filter((e) => e.favorite)
  const others = items.filter((e) => !e.favorite)
  const photos = favs.filter((e) => e.kind === 'photo').length

  const tile = (e: (typeof items)[number]) => (
    <li key={e.id} className="fav">
      <div className="m">
        {e.url && (e.kind === 'photo'
          ? <img src={e.url} alt={title(e.challenge_id)} loading="lazy" />
          : <video src={e.url} controls playsInline preload="metadata" />)}
        {e.favorite && <span className="badge">{t('galJury')}</span>}
      </div>
      <small>{title(e.challenge_id)}</small>
    </li>
  )

  return (
    <>
      <section className="box" aria-labelledby="favTitle">
        <div className="row">
          <h2 id="favTitle" className="grow">{t('favTitle')}</h2>
          <span className="pill">{t('photoCount', { n: photos })} · {t('videoCount', { n: favs.length - photos })}</span>
        </div>
        {favs.length ? <ul className="favs">{favs.map(tile)}</ul> : <p className="empty">{t('noFavs')}</p>}
      </section>
      {withAll && others.length > 0 && (
        <section className="box">
          <h2>{t('galAll')}</h2>
          <ul className="favs">{others.map(tile)}</ul>
        </section>
      )}
    </>
  )
}
