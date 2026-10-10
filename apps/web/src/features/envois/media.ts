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

/** Lit la durée via <video>. Rejette après `timeoutMs` : sur certains téléphones, les métadonnées n'arrivent jamais. */
export function readVideoDuration(file: File, timeoutMs = 10000): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    const finish = (fn: () => void) => {
      clearTimeout(timer)
      video.removeAttribute('src')
      video.load() // libère le fichier
      URL.revokeObjectURL(url)
      fn()
    }
    const timer = setTimeout(() => finish(() => reject(new Error('timeout'))), timeoutMs)
    video.preload = 'metadata'
    video.muted = true
    video.setAttribute('playsinline', '')
    video.onloadedmetadata = () => finish(() => resolve(video.duration))
    video.onerror = () => finish(() => reject(new Error('video')))
    video.src = url
    video.load() // iOS Safari ignore `preload` tant que load() n'est pas appelé
  })
}

// ---- Durée lue dans l'en-tête MP4/MOV, sans décoder la vidéo ----
// Le navigateur ne donne pas la durée d'un codec qu'il ne sait pas lire (HEVC d'iPhone, par exemple).
// Or le conteneur la porte : boîte `moov` > `mvhd` = durée / échelle de temps.

const u32 = (v: DataView, o: number) => v.getUint32(o)
const fourcc = (v: DataView, o: number) => String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3))

/** Durée (secondes) lue dans le contenu de la boîte `moov`, ou `null` si `mvhd` est absente ou invalide. */
export function mvhdDuration(moov: ArrayBuffer): number | null {
  const v = new DataView(moov)
  let pos = 0
  while (pos + 8 <= v.byteLength) {
    const size = u32(v, pos)
    if (size < 8) return null
    if (fourcc(v, pos + 4) === 'mvhd') {
      const body = pos + 8
      const version = v.getUint8(body)
      const timescale = version === 1 ? u32(v, body + 20) : u32(v, body + 12)
      const duration = version === 1
        ? Number(v.getBigUint64(body + 24))
        : u32(v, body + 16)
      return timescale > 0 ? duration / timescale : null
    }
    pos += size
  }
  return null
}

/** Parcourt les boîtes de premier niveau (le `moov` est souvent en fin de fichier sur Android) et lit la durée. */
export async function readMp4Duration(file: Blob): Promise<number> {
  let pos = 0
  while (pos + 8 <= file.size) {
    const head = new DataView(await file.slice(pos, pos + 16).arrayBuffer())
    let size = u32(head, 0)
    let header = 8
    if (size === 1 && head.byteLength >= 16) {
      size = Number(head.getBigUint64(8))
      header = 16
    } else if (size === 0) {
      size = file.size - pos // dernière boîte : jusqu'à la fin
    }
    if (size < header) break
    if (fourcc(head, 4) === 'moov') {
      const d = mvhdDuration(await file.slice(pos + header, pos + size).arrayBuffer())
      return d ?? NaN
    }
    pos += size
  }
  return NaN
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

/** Photo de profil : carré centré de `size` px (JPEG), pour un fichier léger et un cadrage régulier. */
export async function cropSquare(file: File, size = 256): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  canvas.getContext('2d')!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
  bitmap.close()
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('photo'))), 'image/jpeg', PHOTO_QUALITY))
}

export function extensionFor(kind: 'photo' | 'video', file: Blob): string {
  if (kind === 'photo') return 'jpg'
  return file.type === 'video/quicktime' ? 'mov' : file.type === 'video/webm' ? 'webm' : 'mp4'
}
