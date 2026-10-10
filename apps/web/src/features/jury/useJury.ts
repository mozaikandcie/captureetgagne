import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useModerationData } from '../moderation/data'
import type { NoteForm } from '../notation/notes'

export interface EntryStat { avg: number; n: number }

/** Tout ce dont l'espace jury a besoin : contenus, défis, mes notes, moyennes par contenu, nombre de jurés. */
export function useJury(eventId: string, userId: string) {
  const qc = useQueryClient()
  const base = useModerationData(eventId)

  const stats = useQuery({
    queryKey: ['entry-stats', eventId],
    refetchInterval: 20000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('entry_stats', { p_event: eventId })
      if (error) throw error
      return new Map<string, EntryStat>((data ?? []).map((r: { entry_id: string; avg_note: number; n_jurors: number }) => [r.entry_id, { avg: Number(r.avg_note), n: r.n_jurors }]))
    },
  })

  const mine = useQuery({
    queryKey: ['my-scores', eventId, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scores').select('entry_id, respect, quality, originality, comment').eq('juror_id', userId)
      if (error) throw error
      return new Map<string, NoteForm>(data.map((s) => [s.entry_id, { respect: s.respect, quality: s.quality, originality: s.originality, comment: s.comment ?? '' }]))
    },
  })

  const jurors = useQuery({
    queryKey: ['juror-count', eventId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('juror_count', { p_event: eventId })
      if (error) throw error
      return (data as number) ?? 0
    },
  })

  const refresh = async () => {
    await Promise.all(
      ['mod-entries', 'entry-stats', 'my-scores', 'ranking', 'ceremony'].map((k) => qc.invalidateQueries({ queryKey: [k] })),
    )
  }

  return {
    challenges: base.challenges,
    entries: base.entries,
    stats: stats.data ?? new Map<string, EntryStat>(),
    myScores: mine.data ?? new Map<string, NoteForm>(),
    jurorCount: jurors.data ?? 0,
    loading: base.loading || mine.isLoading,
    refresh,
  }
}
