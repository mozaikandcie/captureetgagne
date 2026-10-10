import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { LANGS, useI18n } from '../../i18n'
import { localized } from '../../lib/me'
import { posterUrl, removePoster, uploadPoster } from './posters'

type Json = Record<string, string> | null
interface Challenge {
  id: string; position: number; title: Json; hint: Json; tip: Json; culture: Json; example_path: string | null; kind: 'photo' | 'video' | 'both'
}
interface Draft { title: Record<string, string>; hint: Record<string, string>; tip: string; culture: string; kind: Challenge['kind'] }

const TRANSLATED = LANGS.filter(([code]) => code !== 'fr')
const empty: Draft = { title: {}, hint: {}, tip: '', culture: '', kind: 'photo' }
const fromChallenge = (c: Challenge): Draft => ({
  title: { ...(c.title ?? {}) }, hint: { ...(c.hint ?? {}) }, tip: c.tip?.fr ?? '', culture: c.culture?.fr ?? '', kind: c.kind,
})
/** Garde les traductions renseignées ; le français est obligatoire pour le titre. */
const clean = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v.trim()).map(([k, v]) => [k, v.trim()]))

/** « Gérer les défis » (organisateur) : ajouter, modifier (avec traductions du nom et de la consigne), supprimer. */
export default function ChallengeManager({ eventId, toast }: { eventId: string; toast: (text: string, error?: boolean) => void }) {
  const { t, lang } = useI18n()
  const qc = useQueryClient()
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [draft, setDraft] = useState<Draft>(empty)
  const [askDelete, setAskDelete] = useState<string | null>(null)

  const list = useQuery({
    queryKey: ['manage-challenges', eventId],
    queryFn: async () => {
      const [c, e] = await Promise.all([
        supabase.from('challenges').select('id, position, title, hint, tip, culture, example_path, kind').eq('event_id', eventId).order('position'),
        supabase.from('entries').select('challenge_id').eq('event_id', eventId),
      ])
      if (c.error) throw c.error
      const counts = new Map<string, number>()
      for (const r of e.data ?? []) counts.set(r.challenge_id, (counts.get(r.challenge_id) ?? 0) + 1)
      return { challenges: c.data as Challenge[], counts }
    },
  })
  const refresh = async () => {
    for (const k of ['manage-challenges', 'challenges', 'mod-challenges', 'ceremony']) await qc.invalidateQueries({ queryKey: [k] })
  }

  const challenges = list.data?.challenges ?? []
  const set = (field: 'title' | 'hint', code: string, value: string) => setDraft({ ...draft, [field]: { ...draft[field], [code]: value } })

  async function save() {
    if (!draft.title.fr?.trim()) return toast(t('needTitle'), true)
    const payload = {
      title: clean(draft.title), hint: { fr: 'Libre', ...clean(draft.hint) },
      tip: draft.tip.trim() ? { fr: draft.tip.trim() } : null, culture: draft.culture.trim() ? { fr: draft.culture.trim() } : null, kind: draft.kind,
    }
    const { error } = editing === 'new'
      ? await supabase.from('challenges').insert({ ...payload, event_id: eventId, position: (challenges.at(-1)?.position ?? 0) + 1 })
      : await supabase.from('challenges').update(payload).eq('id', editing!)
    if (error) return toast(t('modFailed'), true)
    toast(editing === 'new' ? t('defiAdded') : t('defiSaved'))
    setEditing(null)
    await refresh()
  }

  async function pickExample(c: Challenge, f: File | undefined) {
    if (!f) return
    try {
      const path = await uploadPoster(eventId, `exemple-${c.id.slice(0, 8)}`, f)
      await removePoster(c.example_path)
      await supabase.from('challenges').update({ example_path: path }).eq('id', c.id)
      toast(t('exampleAdded'))
      await refresh()
    } catch {
      toast(t('photoUnreadable'), true)
    }
  }

  async function remove(c: Challenge) {
    // Les fichiers des envois sont supprimés avant les lignes (la suppression du défi emporte ses envois).
    const { data } = await supabase.from('entries').select('storage_path').eq('challenge_id', c.id)
    const paths = (data ?? []).map((e) => e.storage_path as string)
    if (paths.length) await supabase.storage.from('media').remove(paths)
    await removePoster(c.example_path)
    const { error } = await supabase.from('challenges').delete().eq('id', c.id)
    if (error) return toast(t('modFailed'), true)
    setAskDelete(null)
    toast(t('defiDeleted'))
    await refresh()
  }

  const form = (
    <div className="stack edit">
      <label className="f"><span>{t('fChallengeTitle')}</span><input type="text" value={draft.title.fr ?? ''} onChange={(e) => set('title', 'fr', e.target.value)} /></label>
      <label className="f"><span>{t('fHint')}</span><input type="text" value={draft.hint.fr ?? ''} onChange={(e) => set('hint', 'fr', e.target.value)} /></label>
      <label className="f"><span>{t('fTip')}</span><input type="text" value={draft.tip} onChange={(e) => setDraft({ ...draft, tip: e.target.value })} /></label>
      <label className="f"><span>{t('fCulture')}</span><input type="text" value={draft.culture} onChange={(e) => setDraft({ ...draft, culture: e.target.value })} /></label>
      <label className="f"><span>{t('fType')}</span>
        <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as Challenge['kind'] })}>
          <option value="photo">{t('tPhoto')}</option><option value="video">{t('tVideo')}</option><option value="both">{t('tBoth')}</option>
        </select></label>
      <details>
        <summary>{t('translations')}</summary>
        {TRANSLATED.map(([code, label]) => (
          <div key={code} className="filters">
            <label className="f"><span>{label} · {t('fChallengeTitle')}</span><input type="text" value={draft.title[code] ?? ''} onChange={(e) => set('title', code, e.target.value)} /></label>
            <label className="f"><span>{label} · {t('fHint')}</span><input type="text" value={draft.hint[code] ?? ''} onChange={(e) => set('hint', code, e.target.value)} /></label>
          </div>
        ))}
      </details>
      <div className="row">
        <button type="button" className="btn small" onClick={() => void save()}>{editing === 'new' ? t('addDefi') : t('save')}</button>
        <button type="button" className="btn small ghost" onClick={() => setEditing(null)}>{t('cancel')}</button>
      </div>
    </div>
  )

  return (
    <section className="box">
      <h3>{t('manageDefis')}</h3>
      {challenges.length === 0 && <p className="empty">{t('noDefis')}</p>}
      <ul className="clist">
        {challenges.map((c) => {
          const n = list.data?.counts.get(c.id) ?? 0
          const example = posterUrl(c.example_path)
          if (editing === c.id) {
            return (
              <li key={c.id} className="editing">
                {form}
                <div className="f">
                  <span>{t('exampleLabel')}</span>
                  <div className="row">
                    {example && <img className="pprev" src={example} alt="" />}
                    <label className="btn small ghost">{example ? t('change') : t('add')}
                      <input type="file" accept="image/*" hidden onChange={(e) => void pickExample(c, e.target.files?.[0])} /></label>
                    {example && <button type="button" className="btn small ghost" onClick={() => void removePoster(c.example_path).then(() => supabase.from('challenges').update({ example_path: null }).eq('id', c.id)).then(refresh)}>{t('fPosterRemove')}</button>}
                  </div>
                </div>
              </li>
            )
          }
          return (
            <li key={c.id}>
              <div className="t">
                <b>{localized(c.title, lang)}</b>
                <small>{localized(c.hint, lang)} · {t(c.kind === 'photo' ? 'tPhoto' : c.kind === 'video' ? 'tVideo' : 'tBoth')} · {t('envoisCount', { n })}</small>
              </div>
              {askDelete === c.id ? (
                <div className="row err">
                  <span>{n ? t('deleteWithEntries', { n }) : t('deleteAsk')}</span>
                  <button type="button" className="btn small ghost bad" onClick={() => void remove(c)}>{t('yesDelete')}</button>
                  <button type="button" className="btn small ghost" onClick={() => setAskDelete(null)}>{t('cancel')}</button>
                </div>
              ) : (
                <div className="row">
                  <button type="button" className="btn small ghost" onClick={() => { setDraft(fromChallenge(c)); setEditing(c.id); setAskDelete(null) }}>{t('edit')}</button>
                  <button type="button" className="btn small ghost bad" onClick={() => setAskDelete(c.id)}>{t('delete')}</button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {editing === 'new' ? <div className="editing"><h4>{t('fChallengeNew')}</h4>{form}</div>
        : <button type="button" className="btn small" onClick={() => { setDraft(empty); setEditing('new') }}>+ {t('fChallengeNew')}</button>}
    </section>
  )
}
