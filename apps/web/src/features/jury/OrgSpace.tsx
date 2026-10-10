import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useI18n } from '../../i18n'
import { useToast } from '../../components/Toast'
import RankingTab from '../classement/RankingTab'
import StaffGuard from '../moderation/StaffGuard'
import ToolsTab from '../outils/ToolsTab'
import ChainOverlay from './ChainOverlay'
import ChallengeManager from './ChallengeManager'
import EventForm from './EventForm'
import JurorsManager from './JurorsManager'
import JuryGrid from './JuryGrid'
import SpaceShell from './SpaceShell'
import { useJury } from './useJury'

type Tab = 'event' | 'jurors' | 'contents' | 'ranking' | 'tools'
const TABS: [Tab, string][] = [['event', 'tabEvent'], ['jurors', 'tabJurors'], ['contents', 'tabContents'], ['ranking', 'tabRankingJ'], ['tools', 'tabToolsJ']]

/** Espace organisation : préparer l'événement, composer le jury, suivre les contenus, le classement, les outils. */
export default function OrgSpace() {
  const { eventId } = useParams<{ eventId: string }>()
  return <StaffGuard eventId={eventId!} allow="organizer">{(staff) => <Space eventId={eventId!} label={staff.label} userId={staff.userId} />}</StaffGuard>
}

function Space({ eventId, label, userId }: { eventId: string; label: string; userId: string }) {
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>('event')
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
    <SpaceShell eventId={eventId} title={t('orgSpaceTitle')} label={label} eventName={event.data?.name} tabs={TABS} tab={tab} onTab={setTab}>
      {tab === 'event' && (<><EventForm eventId={eventId} toast={toast} /><ChallengeManager eventId={eventId} toast={toast} /></>)}
      {tab === 'jurors' && <JurorsManager eventId={eventId} toast={toast} />}
      {tab === 'contents' && (jury.loading ? <p role="status">{t('loading')}</p>
        : <JuryGrid jury={jury} userId={userId} isJuror={false} onChain={setChain} toast={toast} />)}
      {tab === 'ranking' && <RankingTab eventId={eventId} isOrganizer userId={userId} publicVote={!!event.data?.public_vote} />}
      {tab === 'tools' && <ToolsTab eventId={eventId} isOrganizer toast={toast} />}
      {chain && <ChainOverlay jury={jury} userId={userId} mode="mod" onClose={() => setChain(null)} toast={toast} />}
      {toastNode}
    </SpaceShell>
  )
}
