import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Kind, ModEntry, Status } from './entries'

export type Json = Record<string, string> | null
export interface Row extends ModEntry {
  participantName: string
  rejectReason: string | null
  storagePath: string
  url: string | null
}
export interface Challenge { id: string; title: Json }

export function useModerationData(eventId: string) {
  const qc = useQueryClient()

  const challenges = useQuery({
    queryKey: ['mod-challenges', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenges').select('id, title').eq('event_id', eventId).order('position')
      if (error) throw error
      return data as Challenge[]
    },
  })

  const entries = useQuery({
    queryKey: ['mod-entries', eventId],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from('entries')
        .select('id, challenge_id, kind, status, favorite, created_at, reject_reason, storage_path, participants!entries_participant_id_fkey(display_name)')
        .eq('event_id', eventId)
        .order('created_at')
      if (error) throw error
      const signed = await supabase.storage.from('media').createSignedUrls(data.map((e) => e.storage_path), 3600)
      const urls = new Map(signed.data?.map((u) => [u.path, u.signedUrl]))
      return data.map((e) => ({
        id: e.id,
        challengeId: e.challenge_id,
        kind: e.kind as Kind,
        status: e.status as Status,
        favorite: e.favorite,
        createdAt: e.created_at,
        rejectReason: e.reject_reason,
        storagePath: e.storage_path,
        participantName: (e.participants as unknown as { display_name: string } | null)?.display_name ?? '',
        url: urls.get(e.storage_path) ?? null,
      }))
    },
  })

  // Temps réel : un nouvel envoi ou un changement de statut rafraîchit la liste.
  useEffect(() => {
    const channel = supabase
      .channel(`mod-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entries', filter: `event_id=eq.${eventId}` },
        () => void qc.invalidateQueries({ queryKey: ['mod-entries', eventId] }))
      .subscribe()
    return () => void supabase.removeChannel(channel)
  }, [eventId, qc])

  return { challenges: challenges.data ?? [], entries: entries.data ?? [], loading: entries.isLoading || challenges.isLoading }
}

export function MediaView({ row, title }: { row: Row; title: string }) {
  if (!row.url) return null
  return row.kind === 'photo'
    ? <img src={row.url} alt={title} />
    : <video src={row.url} controls playsInline preload="metadata" />
}
