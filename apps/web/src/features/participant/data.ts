import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export interface EventInfo {
  id: string
  name: string
  status: string
  ends_at: string | null
  message: string | null
}

export interface ParticipantCtx {
  event: EventInfo
  me: { id: string; display_name: string }
}

/** Défis de l'événement (texte complet : titre, consigne, conseils, culture). */
export function useChallenges(eventId: string) {
  return useQuery({
    queryKey: ['challenges', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenges').select('id, position, title, hint, tip, culture, kind').eq('event_id', eventId).order('position')
      if (error) throw error
      return data
    },
  })
}

/** Envois du participant (id, défi, statut). */
export function useMyEntries(participantId: string) {
  return useQuery({
    queryKey: ['my-entries', participantId],
    queryFn: async () => {
      const { data, error } = await supabase.from('entries').select('id, challenge_id, status').eq('participant_id', participantId)
      if (error) throw error
      return data
    },
  })
}

/** Nombre de notifications non lues. */
export function useUnreadCount(participantId: string) {
  return useQuery({
    queryKey: ['unread', participantId],
    refetchInterval: 30000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications').select('id', { count: 'exact', head: true }).eq('participant_id', participantId).is('read_at', null)
      if (error) throw error
      return count ?? 0
    },
  })
}

/** Défis envoyés (au moins un envoi non refusé) et défis validés par le jury. */
export function progress(entries: { challenge_id: string; status: string }[]) {
  const sent = new Set(entries.filter((e) => e.status !== 'rejected').map((e) => e.challenge_id))
  const ok = new Set(entries.filter((e) => e.status === 'ok').map((e) => e.challenge_id))
  return { sent, ok }
}
