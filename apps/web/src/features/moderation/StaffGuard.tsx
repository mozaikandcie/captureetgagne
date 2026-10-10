import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useSession } from '../../lib/session'
import { useI18n } from '../../i18n'
import PhoneForm from '../inscription/PhoneForm'
import Header from '../../components/Header'

export type Role = 'juror' | 'organizer'

/** Adresse de l'espace propre à chaque rôle : le jury et l'organisation ne partagent pas leur espace. */
export const spacePath = (role: string, eventId: string) => (role === 'organizer' ? `/organisation/${eventId}` : `/jury/${eventId}`)

/**
 * Réserve un écran à une équipe de l'événement.
 * - `allow` : un seul rôle (espace jury ou espace organisation) ou « any » (mur, remise des prix).
 * - Un membre de l'équipe qui arrive dans l'autre espace est renvoyé vers le sien.
 * - Une personne sans rôle (un participant, par exemple) voit un refus avec un lien pour revenir à sa page.
 */
export default function StaffGuard({ eventId, allow = 'any', children }: {
  eventId: string
  allow?: Role | 'any'
  children: (staff: { role: Role; label: string; userId: string }) => ReactNode
}) {
  const { t } = useI18n()
  const qc = useQueryClient()
  const session = useSession()
  const [claimed, setClaimed] = useState(false)

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

  // Un juré invité par l'organisation est rattaché à sa première connexion, avec son numéro.
  useEffect(() => {
    if (!session || staff.isLoading || staff.data || claimed) return
    setClaimed(true)
    void supabase.rpc('claim_staff_invites').then(({ data }) => {
      if ((data as number) > 0) void qc.invalidateQueries({ queryKey: ['staff', eventId] })
    })
  }, [session, staff.isLoading, staff.data, claimed, eventId, qc])

  const back = <p><Link className="btn ghost" to={`/e/${eventId}`}>{t('backToMine')}</Link></p>

  if (session === undefined || (session && staff.isLoading)) return <main className="page"><p role="status">{t('loading')}</p></main>
  if (!session) {
    return (
      <main className="page">
        <Header subtitle={false} />
        <section className="box"><h2>{allow === 'organizer' ? t('orgLogin') : t('juryLogin')}</h2><PhoneForm /></section>
        {back}
      </main>
    )
  }
  if (!staff.data) {
    return (
      <main className="page">
        <Header subtitle={false} />
        <section className="box">
          <p role="alert">{allow === 'organizer' ? t('orgOnly') : t('juryOnly')}</p>
          {back}
        </section>
      </main>
    )
  }
  const role = staff.data.role as Role
  if (allow !== 'any' && role !== allow) return <Navigate to={spacePath(role, eventId)} replace />
  return <>{children({ role, label: staff.data.label, userId: session.user.id })}</>
}
