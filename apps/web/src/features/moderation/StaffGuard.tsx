import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useSession } from '../../lib/session'
import { useI18n } from '../../i18n'
import PhoneForm from '../inscription/PhoneForm'
import Header from '../../components/Header'

/** Réserve un écran au jury et à l'organisation de l'événement. */
export default function StaffGuard({ eventId, children }: {
  eventId: string
  children: (staff: { role: string; label: string }) => ReactNode
}) {
  const { t } = useI18n()
  const session = useSession()
  const staff = useQuery({
    queryKey: ['staff', eventId, session?.user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff').select('role, label').eq('event_id', eventId).eq('user_id', session!.user.id).maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!session,
  })
  if (session === undefined || (session && staff.isLoading)) {
    return <main className="page"><p role="status">{t('loading')}</p></main>
  }
  if (!session) return <main className="page"><Header subtitle={false} /><section className="box"><h2>{t('juryLogin')}</h2><PhoneForm /></section></main>
  if (!staff.data) return <main className="page"><Header subtitle={false} /><p role="alert">{t('juryOnly')}</p></main>
  return <>{children(staff.data)}</>
}
