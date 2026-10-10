import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useI18n } from '../../i18n'
import Avatar from '../../components/Avatar'
import { cropSquare } from '../envois/media'
import type { ParticipantCtx } from './data'

/** Envoie la photo de profil (carré 256 px) dans le dossier du participant et l'enregistre. Renvoie le chemin. */
export async function saveAvatar(eventId: string, participantId: string, file: File, previous?: string | null): Promise<string> {
  const blob = await cropSquare(file)
  const path = `${eventId}/${participantId}/avatar-${Date.now()}.jpg`
  const up = await supabase.storage.from('media').upload(path, blob, { contentType: 'image/jpeg' })
  if (up.error) throw up.error
  const { error } = await supabase.from('participants').update({ avatar_path: path }).eq('id', participantId)
  if (error) throw error
  if (previous) await supabase.storage.from('media').remove([previous])
  return path
}

/** Photo de profil facultative : ajouter, changer ou retirer. Sans photo, les initiales s'affichent. */
export default function AvatarEditor({ ctx }: { ctx: ParticipantCtx }) {
  const { t } = useI18n()
  const qc = useQueryClient()
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { me, event } = ctx

  const refresh = () => qc.invalidateQueries({ queryKey: ['participant'] })

  async function pick(file: File | undefined) {
    if (!file) return
    setBusy(true); setError(null)
    try { await saveAvatar(event.id, me.id, file, me.avatar_path); await refresh() }
    catch { setError(t('photoUnreadable')) }
    finally { setBusy(false); if (input.current) input.current.value = '' }
  }

  async function remove() {
    setBusy(true); setError(null)
    if (me.avatar_path) await supabase.storage.from('media').remove([me.avatar_path])
    const { error: e } = await supabase.from('participants').update({ avatar_path: null }).eq('id', me.id)
    if (e) setError(t('modFailed')); else await refresh()
    setBusy(false)
  }

  return (
    <div className="avatar-edit">
      <Avatar name={me.display_name} path={me.avatar_path} size={64} />
      <div className="stack">
        <input ref={input} type="file" accept="image/*" hidden onChange={(e) => void pick(e.target.files?.[0])} />
        <div className="row">
          <button type="button" className="btn small ghost" disabled={busy} onClick={() => input.current?.click()}>
            {me.avatar_path ? t('avatarChange') : t('avatarAdd')}
          </button>
          {me.avatar_path && <button type="button" className="btn small ghost" disabled={busy} onClick={() => void remove()}>{t('avatarRemove')}</button>}
        </div>
        {!me.avatar_path && <span className="help">{t('avatarInitials')}</span>}
        {error && <span role="alert" className="err">{error}</span>}
      </div>
    </div>
  )
}
