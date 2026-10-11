import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useI18n } from '../../i18n'

/** Adresse nue du site : renvoie vers le dernier événement consulté, sinon vers l'événement ouvert le plus récent. */
export default function RootRedirect() {
  const { t } = useI18n()
  let last: string | null = null
  try { last = sessionStorage.getItem('cg-last-event') } catch { /* ignoré */ }

  const { data, isLoading } = useQuery({
    queryKey: ['root-event'],
    enabled: !last,
    queryFn: async () => {
      const { data, error } = await supabase.from('events').select('id').eq('status', 'live').order('created_at', { ascending: false }).limit(1)
      if (error) throw error
      return data[0]?.id ?? null
    },
  })

  if (last) return <Navigate to={`/e/${last}`} replace />
  if (isLoading) return <main className="page"><p role="status">…</p></main>
  if (data) return <Navigate to={`/e/${data}`} replace />
  return <main className="page"><h1>Capture et Gagne</h1><p role="status">{t('noOpenEvent')}</p></main>
}
