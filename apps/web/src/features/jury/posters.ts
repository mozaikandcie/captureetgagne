import { supabase } from '../../lib/supabase'
import { resizePhoto } from '../envois/media'

/** Adresse publique d'une affiche ou d'une photo d'exemple (bucket `posters`, lisible de tous). */
export function posterUrl(path: string | null | undefined): string | null {
  return path ? supabase.storage.from('posters').getPublicUrl(path).data.publicUrl : null
}

/** Réduit l'image (2048 px, JPEG) et l'envoie dans `posters/<eventId>/<folder>/…`. Renvoie le chemin enregistré. */
export async function uploadPoster(eventId: string, folder: string, file: File): Promise<string> {
  const blob = await resizePhoto(file)
  const path = `${eventId}/${folder}-${Date.now()}.jpg`
  const { error } = await supabase.storage.from('posters').upload(path, blob, { contentType: 'image/jpeg', upsert: true })
  if (error) throw error
  return path
}

export async function removePoster(path: string | null | undefined): Promise<void> {
  if (path) await supabase.storage.from('posters').remove([path])
}
