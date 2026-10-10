import { useOutletContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { localized } from '../../lib/me'
import { useI18n } from '../../i18n'
import { useChallenges, type ParticipantCtx } from './data'

/** Galerie : les contenus validés de l'événement, coups de cœur du jury en premier. */
export default function GalleryPage() {
  const { event } = useOutletContext<ParticipantCtx>()
  const { t, lang } = useI18n()
  const challenges = useChallenges(event.id)

  const items = useQuery({
    queryKey: ['gallery', event.id],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entries').select('id, challenge_id, kind, favorite, storage_path, validated_at')
        .eq('event_id', event.id).eq('status', 'ok')
      if (error) throw error
      const signed = await supabase.storage.from('media').createSignedUrls(data.map((e) => e.storage_path), 3600)
      const urls = new Map(signed.data?.map((u) => [u.path, u.signedUrl]))
      return data
        .map((e) => ({ ...e, url: urls.get(e.storage_path) ?? null }))
        .sort((a, b) => Number(b.favorite) - Number(a.favorite) || (b.validated_at ?? '').localeCompare(a.validated_at ?? ''))
    },
  })

  const title = (id: string) => localized(challenges.data?.find((c) => c.id === id)?.title as Record<string, string> | undefined, lang)
  const favorites = (items.data ?? []).filter((e) => e.favorite)
  const others = (items.data ?? []).filter((e) => !e.favorite)

  const grid = (list: NonNullable<typeof items.data>) => (
    <ul className="gal">
      {list.map((e) => (
        <li key={e.id}>
          <div className="tile">
            {e.url && (e.kind === 'photo'
              ? <img src={e.url} alt={title(e.challenge_id)} loading="lazy" />
              : <video src={e.url} controls playsInline preload="metadata" />)}
            {e.favorite && <span className="pill">{t('galJury')}</span>}
          </div>
          <small>{title(e.challenge_id)}</small>
        </li>
      ))}
    </ul>
  )

  if (items.isLoading) return <p role="status">{t('loading')}</p>
  if (items.isError) return <p role="alert" className="err">{t('netError')}</p>
  if (!items.data?.length) return <section className="box"><h2>{t('navGal')}</h2><p>{t('galEmpty')}</p></section>

  return (
    <>
      {favorites.length > 0 && <section className="box"><h2>{t('favTitle')}</h2>{grid(favorites)}</section>}
      {others.length > 0 && <section className="box"><h2>{t('galAll')}</h2>{grid(others)}</section>}
    </>
  )
}
