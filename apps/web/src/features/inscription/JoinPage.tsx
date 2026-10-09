import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useSession } from '../../lib/session'
import { LANGS, useI18n, type Lang } from '../../i18n'
import PhoneForm from './PhoneForm'
import Onboarding, { hasSeenOnboarding } from './Onboarding'

/** Page ouverte par le QR code : /e/:eventId. Téléphone → code SMS → nom + consentements. */
export default function JoinPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const { t, lang, setLang } = useI18n()
  const session = useSession()

  const event = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, name, status')
        .eq('id', eventId!)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!eventId,
  })

  const me = useQuery({
    queryKey: ['participant', eventId, session?.user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('participants')
        .select('id, display_name')
        .eq('event_id', eventId!)
        .eq('user_id', session!.user.id)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!eventId && !!session,
  })

  if (session === undefined || event.isLoading || (session && me.isLoading)) {
    return <main className="page"><p role="status">{t('loading')}</p></main>
  }
  if (!event.data || event.data.status !== 'live') {
    return <main className="page"><p role="alert">{t('eventNotFound')}</p></main>
  }

  return (
    <main className="page">
      <h1>{event.data.name}</h1>
      <label className="f">
        <span>{t('langLabel')}</span>
        <select value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
          {LANGS.map(([code, label]) => (
            <option key={code} value={code}>{label}</option>
          ))}
        </select>
      </label>
      {!session ? (
        <PhoneForm />
      ) : me.data ? (
        <Welcome name={me.data.display_name} eventId={event.data.id} />
      ) : (
        <ProfileForm eventId={event.data.id} userId={session.user.id} />
      )}
    </main>
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
      event_id: eventId,
      user_id: userId,
      display_name: name.trim(),
      lang,
      consent_rules_at: now,
      consent_image_at: now,
    })
    setBusy(false)
    if (error) return setError(t('netError'))
    await qc.invalidateQueries({ queryKey: ['participant', eventId] })
  }

  return (
    <form onSubmit={submit} noValidate>
      <h2>{t('joinTitle')}</h2>
      <label className="f">
        <span>{t('name')}</span>
        <input type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="check">
        <input type="checkbox" checked={rules} onChange={(e) => setRules(e.target.checked)} />
        <span>{t('acc1')} {t('acc2')} {t('acc3')}</span>
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

function Welcome({ name, eventId }: { name: string; eventId: string }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(() => !hasSeenOnboarding())
  return (
    <>
      <p role="status">{t('hello', { n: name })}</p>
      <Link className="btn" to={`/e/${eventId}/defis`}>{t('go')}</Link>
      {open && <Onboarding onClose={() => setOpen(false)} />}
    </>
  )
}
