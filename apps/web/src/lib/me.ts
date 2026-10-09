import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'
import { useSession } from './session'

/** Participant connecté pour cet événement (`undefined` : chargement, `null` : pas inscrit). */
export function useMe(eventId: string | undefined) {
  const session = useSession()
  const q = useQuery({
    queryKey: ['participant', eventId, session?.user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('participants')
        .select('id, display_name')
        .eq('event_id', eventId!)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!eventId && !!session,
  })
  return { session, me: q.data, loading: session === undefined || (!!session && q.isLoading) }
}

/** Lit un texte `{"fr": "...", "gp": "..."}` avec repli sur le français. */
export function localized(value: Record<string, string> | null | undefined, lang: string): string {
  return value?.[lang] ?? value?.fr ?? ''
}
