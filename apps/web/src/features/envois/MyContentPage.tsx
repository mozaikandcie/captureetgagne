import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { localized, useMe } from '../../lib/me'
import { useI18n } from '../../i18n'

const STATUS_KEY = { pending: 'stPending', ok: 'stOk', rejected: 'stRejected' } as const

/** « Mes contenus » : envois, statut, motif de refus, et retrait (suppression de la ligne ET du fichier). */
export default function MyContentPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const { t, lang } = useI18n()
  const { me, loading } = useMe(eventId)
  const qc = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const entries = useQuery({
    queryKey: ['my-content', me?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entries')
        .select('id, kind, status, reject_reason, storage_path, created_at, challenges(title)')
        .eq('participant_id', me!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      const urls = await supabase.storage.from('media').createSignedUrls(data.map((e) => e.storage_path), 3600)
      const byPath = new Map(urls.data?.map((u) => [u.path, u.signedUrl]))
      return data.map((e) => ({ ...e, url: byPath.get(e.storage_path) ?? null }))
    },
    enabled: !!me,
  })

  async function remove(id: string, path: string) {
    if (!window.confirm(t('confirmRemove'))) return
    setError(null)
    // Fichier d'abord : si la suppression de la ligne échouait ensuite, le contenu ne serait plus lisible mais resterait listé.
    const file = await supabase.storage.from('media').remove([path])
    const row = file.error ? { error: file.error } : await supabase.from('entries').delete().eq('id', id)
    if (row.error) return setError(t('removeFailed'))
    await qc.invalidateQueries({ queryKey: ['my-content'] })
    await qc.invalidateQueries({ queryKey: ['my-entries'] })
  }

  if (loading || entries.isLoading) return <main className="page"><p role="status">{t('loading')}</p></main>
  // Pas connecté ou pas inscrit : retour à la page d'inscription, qui gère les deux cas.
  if (!me) return <Navigate to={`/e/${eventId}`} replace />

  return (
    <main className="page">
      <h1>{t('mine')}</h1>
      <p className="help">{t('mineNote')}</p>
      <p><Link to={`/e/${eventId}/defis`}>{t('back')}</Link></p>
      {error && <p role="alert" className="err">{error}</p>}
      {entries.data?.length === 0 && <p>{t('noEntries')}</p>}
      <ul className="cards">
        {entries.data?.map((e) => {
          const title = localized((e.challenges as unknown as { title: Record<string, string> } | null)?.title, lang)
          return (
            <li key={e.id} className="card">
              <h2>{title}</h2>
              {e.url && (e.kind === 'photo'
                ? <img src={e.url} alt={title} loading="lazy" />
                : <video src={e.url} controls playsInline preload="metadata" />)}
              <p><strong>{t(STATUS_KEY[e.status as keyof typeof STATUS_KEY])}</strong></p>
              {e.status === 'rejected' && e.reject_reason && <p className="err">{e.reject_reason}</p>}
              <button type="button" className="link" onClick={() => void remove(e.id, e.storage_path)}>
                {t('removeIt')}
              </button>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
