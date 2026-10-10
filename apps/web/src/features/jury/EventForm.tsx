import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useI18n } from '../../i18n'
import { posterUrl, removePoster, uploadPoster } from './posters'

interface EventRow {
  name: string; date_label: string | null; place: string | null; ends_at: string | null; message: string | null
  prizes: string | null; rules: string; status: string; public_vote: boolean; poster_path: string | null
}

/** « datetime-local » attend l'heure locale sans fuseau. */
const toLocal = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso), z = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`
}

/** « Annoncer l'événement » (organisateur) : texte, lots, règlement, Prix du public, état, affiche. */
export default function EventForm({ eventId, toast }: { eventId: string; toast: (text: string, error?: boolean) => void }) {
  const { t } = useI18n()
  const qc = useQueryClient()
  const file = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<EventRow | null>(null)
  const [busy, setBusy] = useState(false)

  const row = useQuery({
    queryKey: ['event-form', eventId],
    queryFn: async () => {
      const { data, error } = await supabase.from('events')
        .select('name, date_label, place, ends_at, message, prizes, rules, status, public_vote, poster_path').eq('id', eventId).single()
      if (error) throw error
      return data as EventRow
    },
  })
  useEffect(() => { if (row.data) setForm(row.data) }, [row.data])
  if (!form) return null

  const set = <K extends keyof EventRow>(k: K, v: EventRow[K]) => setForm({ ...form, [k]: v })
  const poster = posterUrl(form.poster_path)

  async function save() {
    if (!form) return
    setBusy(true)
    const { error } = await supabase.from('events').update({
      name: form.name.trim(), date_label: form.date_label?.trim() || null, place: form.place?.trim() || null,
      ends_at: form.ends_at, message: form.message?.trim() || null, prizes: form.prizes?.trim() || null,
      rules: form.rules.trim(), status: form.status, public_vote: form.public_vote, poster_path: form.poster_path,
    }).eq('id', eventId)
    setBusy(false)
    if (error) return toast(t('modFailed'), true)
    await qc.invalidateQueries({ queryKey: ['event', eventId] })
    toast(t('published'))
  }

  async function pickPoster(f: File | undefined) {
    if (!f || !form) return
    try {
      const path = await uploadPoster(eventId, 'affiche', f)
      await removePoster(form.poster_path)
      setForm({ ...form, poster_path: path })
      await supabase.from('events').update({ poster_path: path }).eq('id', eventId)
      await qc.invalidateQueries({ queryKey: ['event', eventId] })
      toast(t('posterAdded'))
    } catch {
      toast(t('photoUnreadable'), true)
    }
  }

  async function dropPoster() {
    if (!form) return
    await removePoster(form.poster_path)
    await supabase.from('events').update({ poster_path: null }).eq('id', eventId)
    setForm({ ...form, poster_path: null })
    await qc.invalidateQueries({ queryKey: ['event', eventId] })
    toast(t('posterRemoved'))
  }

  return (
    <section className="box">
      <h3>{t('announceTitle')}</h3>
      <p className="help">{t('announceHelp')}</p>
      <div className="filters">
        <label className="f"><span>{t('fEventName')}</span><input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} /></label>
        <label className="f"><span>{t('fEventDate')}</span><input type="text" value={form.date_label ?? ''} onChange={(e) => set('date_label', e.target.value)} /></label>
        <label className="f"><span>{t('fEventPlace')}</span><input type="text" value={form.place ?? ''} onChange={(e) => set('place', e.target.value)} /></label>
        <label className="f"><span>{t('fEventEnd')}</span>
          <input type="datetime-local" value={toLocal(form.ends_at)}
            onChange={(e) => set('ends_at', e.target.value ? new Date(e.target.value).toISOString() : null)} /></label>
      </div>
      <label className="f"><span>{t('fEventMsg')}</span><textarea rows={3} value={form.message ?? ''} onChange={(e) => set('message', e.target.value)} /></label>
      <div className="f">
        <span>{t('fEventPoster')}</span>
        <div className="row">
          {poster && <img className="pprev" src={poster} alt="" />}
          <input ref={file} type="file" accept="image/*" hidden onChange={(e) => void pickPoster(e.target.files?.[0])} />
          <button type="button" className="btn small ghost" onClick={() => file.current?.click()}>{t('fPosterChoose')}</button>
          {poster && <button type="button" className="btn small ghost" onClick={() => void dropPoster()}>{t('fPosterRemove')}</button>}
        </div>
        <span className="help">{t('fPosterHelp')}</span>
      </div>
      <label className="f"><span>{t('fEventPrize')}</span><input type="text" value={form.prizes ?? ''} placeholder={t('fEventPrizeEx')} onChange={(e) => set('prizes', e.target.value)} /></label>
      <label className="f"><span>{t('fEventStatus')}</span>
        <select value={form.status} onChange={(e) => set('status', e.target.value)}>
          <option value="draft">{t('statusDraft')}</option>
          <option value="live">{t('statusLive')}</option>
          <option value="closed">{t('statusClosed')}</option>
        </select></label>
      <label className="check"><input type="checkbox" checked={form.public_vote} onChange={(e) => set('public_vote', e.target.checked)} /><span>{t('fEventPublic')}</span></label>
      <label className="f"><span>{t('fEventRules')}</span><textarea rows={8} value={form.rules} onChange={(e) => set('rules', e.target.value)} /></label>
      <button type="button" className="btn" disabled={busy || !form.name.trim()} onClick={() => void save()}>{t('publish')}</button>
    </section>
  )
}
