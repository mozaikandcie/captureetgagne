import { supabase } from '../../lib/supabase'
import { clampNote, type NoteForm } from '../notation/notes'
import type { Status } from '../moderation/entries'

/** Valide, refuse ou remet en modération. Le trigger crée la notification et efface les notes si le contenu n'est plus validé. */
export async function moderate(id: string, status: Status, reason?: string | null) {
  const { error } = await supabase.from('entries')
    .update({ status, reject_reason: status === 'rejected' ? (reason?.trim() || null) : null }).eq('id', id)
  return error
}

/** Coup de cœur : 3 maximum par type de média (vérifié par le serveur). */
export async function setFavorite(id: string, favorite: boolean) {
  const { error } = await supabase.from('entries').update({ favorite }).eq('id', id)
  return error
}

export async function saveNote(entryId: string, jurorId: string, note: NoteForm) {
  const { error } = await supabase.from('scores').upsert({
    entry_id: entryId, juror_id: jurorId,
    respect: clampNote(note.respect), quality: clampNote(note.quality), originality: clampNote(note.originality),
    comment: note.comment.trim() || null, updated_at: new Date().toISOString(),
  })
  return error
}
