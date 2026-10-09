import { useRef, useState } from 'react'
import { useI18n } from '../../i18n'
import { enqueue } from './queue'
import { checkVideo, extensionFor, readVideoDuration, resizePhoto } from './media'

type Kind = 'photo' | 'video' | 'both'
const ACCEPT: Record<Kind, string> = { photo: 'image/*', video: 'video/*', both: 'image/*,video/*' }

interface Props {
  eventId: string
  participantId: string
  challengeId: string
  kind: Kind
  disabled?: boolean
}

/** Choix du fichier, vérifications locales (durée, taille), réduction des photos, puis mise en file. */
export default function UploadButton({ eventId, participantId, challengeId, kind, disabled }: Props) {
  const { t } = useI18n()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onFile(file: File | undefined) {
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      const isVideo = file.type.startsWith('video/')
      let blob: Blob = file
      if (isVideo) {
        const problem = checkVideo(await readVideoDuration(file).catch(() => NaN), file.size)
        if (problem) return setError(t(problem))
      } else {
        blob = await resizePhoto(file).catch(() => {
          throw new Error('photoUnreadable')
        })
      }
      const mediaKind = isVideo ? 'video' : 'photo'
      const id = crypto.randomUUID()
      await enqueue({
        id,
        eventId,
        participantId,
        challengeId,
        kind: mediaKind,
        path: `${eventId}/${participantId}/${id}.${extensionFor(mediaKind, blob)}`,
        contentType: isVideo ? file.type || 'video/mp4' : 'image/jpeg',
        blob,
      })
    } catch (e) {
      setError(t(e instanceof Error && e.message === 'photoUnreadable' ? 'photoUnreadable' : 'uploadFailed'))
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div>
      <input ref={input} type="file" accept={ACCEPT[kind]} hidden
        onChange={(e) => void onFile(e.target.files?.[0])} />
      <button type="button" className="btn" disabled={disabled || busy} onClick={() => input.current?.click()}>
        {busy ? t('preparing') : disabled ? t('full') : t('send')}
      </button>
      {error && <p role="alert" className="err">{error}</p>}
    </div>
  )
}
