import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useI18n } from '../../i18n'
import Header from '../../components/Header'

/** Cadre commun aux deux espaces : en-tête, bandeau (titre, personne, retour participant, déconnexion) et onglets. */
export default function SpaceShell<T extends string>({ eventId, title, label, eventName, tabs, tab, onTab, children }: {
  eventId: string; title: string; label: string; eventName?: string
  tabs: [T, string][]; tab: T; onTab: (t: T) => void; children: ReactNode
}) {
  const { t } = useI18n()
  return (
    <main className="page wide">
      <Header subtitle={false} />
      <div className="orgbar">
        <span className="pill">{title}</span>
        <span className="grow help">{label}{eventName ? ` · ${eventName}` : ''}</span>
        <Link to={`/e/${eventId}`} className="link">{t('toParticipant')}</Link>
        <button type="button" className="link" onClick={() => void supabase.auth.signOut()}>{t('logout')}</button>
      </div>
      <div role="tablist" className="tabs">
        {tabs.map(([id, text]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'tab on' : 'tab'} onClick={() => onTab(id)}>{t(text)}</button>
        ))}
      </div>
      {children}
    </main>
  )
}
