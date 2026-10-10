import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useI18n } from '../../i18n'
import Header from '../../components/Header'
import { useToast } from '../../components/Toast'
import RankingTab from '../classement/RankingTab'
import ChainOverlay from '../jury/ChainOverlay'
import ChallengeManager from '../jury/ChallengeManager'
import EventForm from '../jury/EventForm'
import JuryGrid from '../jury/JuryGrid'
import { useJury } from '../jury/useJury'
import ToolsTab from '../outils/ToolsTab'
import StaffGuard from './StaffGuard'

type Tab = 'jury' | 'ranking' | 'tools'
const TABS: [Tab, string][] = [['jury', 'tabJury'], ['ranking', 'tabRankingJ'], ['tools', 'tabToolsJ']]

/** Espace organisation : /jury/:eventId. Trois onglets comme le prototype : Jury, Classement, Outils. */
export default function JuryPage() {
  const { eventId } = useParams<{ eventId: string }>()
  return <StaffGuard eventId={eventId!}>{(staff) => <Space eventId={eventId!} role={staff.role} label={staff.label} userId={staff.userId} />}</StaffGuard>
}

function Space({ eventId, role, label, userId }: { eventId: string; role: string; label: string; userId: string }) {
  const { t } = useI18n()
  const isOrganizer = role === 'organizer'
  const isJuror = role === 'juror'
  const [tab, setTab] = useState<Tab>('jury')
  const [chain, setChain] = useState<'mod' | 'score' | null>(null)
  const { toast, toastNode } = useToast()
  const jury = useJury(eventId, userId)

  const event = useQuery({
    queryKey: ['event-flags', eventId],
    queryFn: async () => {
      const { data, error } = await supabase.from('events').select('name, public_vote').eq('id', eventId).single()
      if (error) throw error
      return data
    },
  })

  return (
    <main className="page wide">
      <Header subtitle={false} />
      <div className="orgbar">
        <span className="pill">{t('orgSpace')}</span>
        <span className="grow help">{label}{event.data ? ` · ${event.data.name}` : ''}</span>
        <Link to={`/e/${eventId}`} className="link">{t('toParticipant')}</Link>
        <button type="button" className="link" onClick={() => void supabase.auth.signOut()}>{t('logout')}</button>
      </div>
      <div role="tablist" className="tabs">
        {TABS.map(([id, text]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'tab on' : 'tab'} onClick={() => setTab(id)}>{t(text)}</button>
        ))}
      </div>

      {tab === 'jury' && (
        <>
          {jury.loading ? <p role="status">{t('loading')}</p>
            : <JuryGrid jury={jury} userId={userId} isJuror={isJuror} onChain={setChain} toast={toast} />}
          {isOrganizer && <EventForm eventId={eventId} toast={toast} />}
          {isOrganizer && <ChallengeManager eventId={eventId} toast={toast} />}
        </>
      )}
      {tab === 'ranking' && <RankingTab eventId={eventId} isOrganizer={isOrganizer} userId={userId} publicVote={!!event.data?.public_vote} />}
      {tab === 'tools' && <ToolsTab eventId={eventId} isOrganizer={isOrganizer} toast={toast} />}

      {chain && <ChainOverlay jury={jury} userId={userId} mode={isJuror ? chain : 'mod'} onClose={() => setChain(null)} toast={toast} />}
      {toastNode}
    </main>
  )
}
