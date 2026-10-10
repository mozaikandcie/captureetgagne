import { useRef, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useI18n } from '../../i18n'
import type { EventInfo } from '../participant/data'
import PhoneForm from './PhoneForm'
import Avatar from '../../components/Avatar'
import { saveAvatar } from '../participant/AvatarEditor'

/** Inscription : téléphone → code SMS → nom + consentements. Le cadre (en-tête, événement) vient de ParticipantArea. */
export default function JoinPage({ event, userId }: { event: EventInfo; userId?: string }) {
  const { t } = useI18n()
  if (event.status !== 'live') return <p role="alert">{t('eventNotFound')}</p>
  return (
    <section className="box">
      <h2>{t('joinTitle')}</h2>
      <p className="help">{t('joinIntro')}</p>
      {userId ? <ProfileForm eventId={event.id} userId={userId} /> : <PhoneForm />}
    </section>
  )
}

function ProfileForm({ eventId, userId }: { eventId: string; userId: string }) {
  const { t, lang } = useI18n()
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [rules, setRules] = useState(false)
  const [image, setImage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const picker = useRef<HTMLInputElement>(null)

  function choose(f: File | undefined) {
    if (preview) URL.revokeObjectURL(preview)
    setPhoto(f ?? null)
    setPreview(f ? URL.createObjectURL(f) : null)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError(t('nameRequired'))
    if (!rules || !image) return setError(t('consentRequired'))
    setBusy(true)
    setError(null)
    const now = new Date().toISOString()
    const { data, error } = await supabase.from('participants').insert({
      event_id: eventId, user_id: userId, display_name: name.trim(), lang,
      consent_rules_at: now, consent_image_at: now,
    }).select('id').single()
    if (error) { setBusy(false); return setError(t('netError')) }
    // La photo est facultative : si son envoi échoue, l'inscription reste valable (on peut la mettre plus tard dans « Moi »).
    if (photo && data) await saveAvatar(eventId, data.id, photo).catch(() => undefined)
    setBusy(false)
    await qc.invalidateQueries({ queryKey: ['participant', eventId] })
  }

  return (
    <form onSubmit={submit} noValidate className="stack">
      <label className="f">
        <span>{t('name')}</span>
        <input type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <div className="f">
        <span>{t('avatarOptional')}</span>
        <div className="avatar-edit">
          {preview ? <img className="avatar" style={{ width: 56, height: 56 }} src={preview} alt="" /> : <Avatar name={name || '?'} size={56} />}
          <input ref={picker} type="file" accept="image/*" hidden onChange={(e) => choose(e.target.files?.[0])} />
          <div className="stack">
            <div className="row">
              <button type="button" className="btn small ghost" onClick={() => picker.current?.click()}>{photo ? t('avatarChange') : t('avatarAdd')}</button>
              {photo && <button type="button" className="btn small ghost" onClick={() => choose(undefined)}>{t('avatarRemove')}</button>}
            </div>
            {!photo && <span className="help">{t('avatarInitials')}</span>}
          </div>
        </div>
      </div>
      <label className="check">
        <input type="checkbox" checked={rules} onChange={(e) => setRules(e.target.checked)} />
        <span>{t('acc1')} <a href={`/e/${eventId}/reglement`} target="_blank" rel="noopener">{t('acc2')}</a> {t('acc3')}</span>
      </label>
      <label className="check">
        <input type="checkbox" checked={image} onChange={(e) => setImage(e.target.checked)} />
        <span>{t('accImg')}</span>
      </label>
      {error && <p role="alert" className="err">{error}</p>}
      <button type="submit" className="btn" disabled={busy}>{t('go')}</button>
    </form>
  )
}
