import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { localized } from '../../lib/me'
import { useI18n } from '../../i18n'
import { MediaView, useModerationData } from '../moderation/data'
import { average, clampNote, emptyNote, toScore, type NoteForm } from './notes'

const CRITERIA = [
  ['respect', 'critRespect'],
  ['quality', 'critQuality'],
  ['originality', 'critOriginality'],
] as const

interface MyScore extends NoteForm { entryId: string }

/** Notation par le juré connecté : une ligne `scores` par envoi, modifiable à tout moment. */
export default function NotesTab({ eventId, userId }: { eventId: string; userId: string }) {
  const { t, lang } = useI18n()
  const qc = useQueryClient()
  const { challenges, entries, loading } = useModerationData(eventId)
  const [editing, setEditing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mine = useQuery({
    queryKey: ['my-scores', eventId, userId],
    queryFn: async (): Promise<MyScore[]> => {
      const { data, error } = await supabase
        .from('scores').select('entry_id, respect, quality, originality, comment').eq('juror_id', userId)
      if (error) throw error
      return data.map((s) => ({ entryId: s.entry_id, respect: s.respect, quality: s.quality, originality: s.originality, comment: s.comment ?? '' }))
    },
  })

  if (loading || mine.isLoading) return <p role="status">{t('loading')}</p>

  const scores = mine.data ?? []
  const scoredIds = new Set(scores.map((s) => s.entryId))
  const waiting = toScore(entries, scoredIds)
  const title = (id: string) => localized(challenges.find((c) => c.id === id)?.title, lang)

  const current = entries.find((e) => e.id === (editing ?? waiting[0]?.id))
  const existing = current ? scores.find((s) => s.entryId === current.id) : undefined

  async function save(entryId: string, note: NoteForm) {
    setError(null)
    const { error } = await supabase.from('scores').upsert({
      entry_id: entryId,
      juror_id: userId,
      respect: clampNote(note.respect),
      quality: clampNote(note.quality),
      originality: clampNote(note.originality),
      comment: note.comment.trim() || null,
      updated_at: new Date().toISOString(),
    })
    if (error) return setError(t('noteFailed'))
    setEditing(null)
    await qc.invalidateQueries({ queryKey: ['my-scores', eventId, userId] })
  }

  const scored = entries.filter((e) => e.status === 'ok' && scoredIds.has(e.id))

  return (
    <section>
      <p role="status">{waiting.length ? t('toScore', { n: waiting.length }) : t('noneToScore')}</p>
      {error && <p role="alert" className="err">{error}</p>}
      {current && (
        <>
          <h2>{title(current.challengeId)}</h2>
          <p className="help">{t('by', { n: current.participantName })}</p>
          <MediaView row={current} title={title(current.challengeId)} />
          <NoteEditor key={current.id} initial={existing ?? emptyNote} onSave={(n) => save(current.id, n)} />
        </>
      )}
      {scored.length > 0 && (
        <>
          <h3>{t('scoredList')}</h3>
          <ul className="cards">
            {scored.map((e) => (
              <li key={e.id} className="card">
                <strong>{title(e.challengeId)}</strong> <span className="help">{t('by', { n: e.participantName })}</span>
                <button type="button" className="link" onClick={() => setEditing(e.id)}>{t('editNote')}</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

function NoteEditor({ initial, onSave }: { initial: NoteForm; onSave: (n: NoteForm) => Promise<void> }) {
  const { t } = useI18n()
  const [note, setNote] = useState<NoteForm>(initial)
  const [busy, setBusy] = useState(false)
  const avg = average(note).toFixed(1).replace('.', ',')

  return (
    <form onSubmit={async (e) => { e.preventDefault(); setBusy(true); await onSave(note); setBusy(false) }}>
      {CRITERIA.map(([key, label]) => (
        <label key={key} className="f">
          <span>{t(label)} : {note[key]} / 10</span>
          <input type="range" min={0} max={10} step={1} value={note[key]}
            onChange={(e) => setNote({ ...note, [key]: Number(e.target.value) })} />
        </label>
      ))}
      <p><strong>{t('noteAvg', { n: avg })}</strong></p>
      <label className="f">
        <span>{t('commentLabel')}</span>
        <input type="text" value={note.comment} onChange={(e) => setNote({ ...note, comment: e.target.value })} />
      </label>
      <button type="submit" className="btn" disabled={busy}>{t('saveNote')}</button>
    </form>
  )
}
