import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { avatarColor, initials } from '../lib/avatar'

/** Pastille du participant : sa photo si elle en a mis une, sinon ses initiales sur fond de couleur. */
export default function Avatar({ name, path, size = 56 }: { name: string; path?: string | null; size?: number }) {
  const url = useQuery({
    queryKey: ['avatar', path],
    enabled: !!path,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from('media').createSignedUrl(path!, 3600)
      if (error) throw error
      return data.signedUrl
    },
  })
  const style = { width: size, height: size, fontSize: size * 0.4 }
  return url.data
    ? <img className="avatar" style={style} src={url.data} alt={name} />
    : <span className="avatar" style={{ ...style, background: avatarColor(name) }} role="img" aria-label={name}>{initials(name)}</span>
}
