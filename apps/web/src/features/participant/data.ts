import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export interface EventInfo {
  id: string
  name: string
  status: string
  ends_at: string | null
  message: string | null
  date_label: string | null
  place: string | null
  prizes: string | null
  public_vote: boolean
  poster_path: string | null
}

export interface ParticipantCtx {
  event: EventInfo
  me: { id: string; display_name: string }
  /** L'écran d'ouverture est terminé : les écrans de bienvenue peuvent s'afficher. */
  splashDone: boolean
}

/** Défis de l'événement (texte complet : titre, consigne, conseils, culture). */
export function useChallenges(eventId: string) {
  return useQuery({
    queryKey: ['challenges', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenges').select('id, position, title, hint, tip, culture, kind, example_path').eq('event_id', eventId).order('position')
      if (error) throw error
      return data
    },
  })
}

export interface MyEntry {
  id: string
  challenge_id: string
  kind: 'photo' | 'video'
  status: 'pending' | 'ok' | 'rejected'
  favorite: boolean
  reject_reason: string | null
  created_at: string
  url: string | null
  /** Moyenne des notes des jurés (/10), `null` tant que personne n'a noté. */
  note: number | null
  comments: string[]
}

/** Envois du participant, avec adresse signée du fichier, note du jury et commentaires. */
export function useMyEntries(participantId: string) {
  return useQuery({
    queryKey: ['my-entries', participantId],
    queryFn: async (): Promise<MyEntry[]> => {
      const { data, error } = await supabase
        .from('entries')
        .select('id, challenge_id, kind, status, favorite, reject_reason, created_at, storage_path, scores(respect, quality, originality, comment)')
        .eq('participant_id', participantId)
        .order('created_at', { ascending: false })
      if (error) throw error
      const signed = await supabase.storage.from('media').createSignedUrls(data.map((e) => e.storage_path), 3600)
      const urls = new Map(signed.data?.map((u) => [u.path, u.signedUrl]))
      return data.map((e) => {
        const scores = (e.scores ?? []) as { respect: number; quality: number; originality: number; comment: string | null }[]
        const note = scores.length
          ? scores.reduce((sum, s) => sum + (s.respect + s.quality + s.originality) / 3, 0) / scores.length
          : null
        return {
          id: e.id,
          challenge_id: e.challenge_id,
          kind: e.kind as MyEntry['kind'],
          status: e.status as MyEntry['status'],
          favorite: e.favorite,
          reject_reason: e.reject_reason,
          created_at: e.created_at,
          url: urls.get(e.storage_path) ?? null,
          note,
          comments: scores.map((s) => s.comment).filter((c): c is string => !!c),
        }
      })
    },
  })
}

/** Contenus validés de l'événement (galerie, coups de cœur), coups de cœur en premier. */
export function useGallery(eventId: string) {
  return useQuery({
    queryKey: ['gallery', eventId],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entries').select('id, challenge_id, kind, favorite, storage_path, validated_at')
        .eq('event_id', eventId).eq('status', 'ok')
      if (error) throw error
      const signed = await supabase.storage.from('media').createSignedUrls(data.map((e) => e.storage_path), 3600)
      const urls = new Map(signed.data?.map((u) => [u.path, u.signedUrl]))
      return data
        .map((e) => ({ ...e, url: urls.get(e.storage_path) ?? null }))
        .sort((a, b) => Number(b.favorite) - Number(a.favorite) || (b.validated_at ?? '').localeCompare(a.validated_at ?? ''))
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

/** Nombre de votes du public par envoi (le détail des votes reste privé). */
export function useVoteCounts(eventId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['vote-counts', eventId],
    enabled,
    refetchInterval: 20000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('vote_counts', { p_event: eventId })
      if (error) throw error
      return new Map<string, number>((data ?? []).map((r: { entry_id: string; votes: number }) => [r.entry_id, r.votes]))
    },
  })
}

/** Envois pour lesquels ce participant a voté. */
export function useMyVotes(participantId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['my-votes', participantId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from('votes').select('entry_id').eq('participant_id', participantId)
      if (error) throw error
      return new Set((data ?? []).map((v) => v.entry_id as string))
    },
  })
}

/** Badges obtenus par ce participant. */
export function useMyBadges(participantId: string) {
  return useQuery({
    queryKey: ['my-badges', participantId],
    queryFn: async () => {
      const { data, error } = await supabase.from('participant_badges').select('badge').eq('participant_id', participantId)
      if (error) throw error
      return new Set((data ?? []).map((b) => b.badge as string))
    },
  })
}
