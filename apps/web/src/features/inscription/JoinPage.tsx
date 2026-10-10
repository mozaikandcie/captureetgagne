import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useI18n } from '../../i18n'
import type { EventInfo } from '../participant/data'
import PhoneForm from './PhoneForm'

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

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError(t('nameRequired'))
    if (!rules || !image) return setError(t('consentRequired'))
    setBusy(true)
    setError(null)
    const now = new Date().toISOString()
    const { error } = await supabase.from('participants').insert({
      event_id: eventId, user_id: userId, display_name: name.trim(), lang,
      consent_rules_at: now, consent_image_at: now,
    })
    setBusy(false)
    if (error) return setError(t('netError'))
    await qc.invalidateQueries({ queryKey: ['participant', eventId] })
  }

  return (
    <form onSubmit={submit} noValidate className="stack">
      <label className="f">
        <span>{t('name')}</span>
        <input type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
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
