// Règles d'envoi (CLAUDE.md, section 6) : photos 2048 px max en JPEG 0,85 ; vidéos 30 s et 50 Mo max (plafond du plan Free de Supabase ;
// repasser à 200 Mo avec le plan Pro, en même temps que la limite du bucket `media`).

export const PHOTO_MAX_SIDE = 2048
export const PHOTO_QUALITY = 0.85
export const VIDEO_MAX_SECONDS = 30
export const VIDEO_MAX_MB = 50
export const VIDEO_MAX_BYTES = VIDEO_MAX_MB * 1024 * 1024

/** Dimensions après réduction : le plus grand côté ne dépasse pas `max`, jamais d'agrandissement. */
export function fitWithin(width: number, height: number, max = PHOTO_MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

export type VideoError = 'videoTooLong' | 'videoTooBig' | 'videoUnreadable'

/** Clé de traduction de l'erreur, ou `null` si la vidéo est acceptée. */
export function checkVideo(durationSeconds: number, sizeBytes: number): VideoError | null {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return 'videoUnreadable'
  if (durationSeconds > VIDEO_MAX_SECONDS) return 'videoTooLong'
  if (sizeBytes > VIDEO_MAX_BYTES) return 'videoTooBig'
  return null
}

export function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    const done = () => URL.revokeObjectURL(url)
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      done()
      resolve(video.duration)
    }
    video.onerror = () => {
      done()
      reject(new Error('video'))
    }
    video.src = url
  })
}

/** Réduit la photo sur le téléphone avant l'envoi (orientation EXIF appliquée). */
export async function resizePhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const { width, height } = fitWithin(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('photo'))), 'image/jpeg', PHOTO_QUALITY),
  )
}

export function extensionFor(kind: 'photo' | 'video', file: Blob): string {
  if (kind === 'photo') return 'jpg'
  return file.type === 'video/quicktime' ? 'mov' : file.type === 'video/webm' ? 'webm' : 'mp4'
}
