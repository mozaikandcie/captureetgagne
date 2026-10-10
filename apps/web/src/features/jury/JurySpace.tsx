import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useI18n } from '../../i18n'
import { useToast } from '../../components/Toast'
import RankingTab from '../classement/RankingTab'
import StaffGuard from '../moderation/StaffGuard'
import ChainOverlay from './ChainOverlay'
import JuryGrid from './JuryGrid'
import SpaceShell from './SpaceShell'
import { useJury } from './useJury'

type Tab = 'score' | 'ranking'

/** Espace jury : modérer et noter les contenus, voir le classement, lancer le mur. Réservé aux jurés. */
export default function JurySpace() {
  const { eventId } = useParams<{ eventId: string }>()
  return <StaffGuard eventId={eventId!} allow="juror">{(staff) => <Space eventId={eventId!} label={staff.label} userId={staff.userId} />}</StaffGuard>
}

function Space({ eventId, label, userId }: { eventId: string; label: string; userId: string }) {
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>('score')
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
    <SpaceShell eventId={eventId} title={t('jurySpaceTitle')} label={label} eventName={event.data?.name}
      tabs={[['score', 'tabModScore'], ['ranking', 'tabRankingJ']]} tab={tab} onTab={setTab}>
      {tab === 'score' && (
        <>
          {jury.loading ? <p role="status">{t('loading')}</p>
            : <JuryGrid jury={jury} userId={userId} isJuror onChain={setChain} toast={toast} />}
          <p><Link className="btn small ghost" to={`/jury/${eventId}/mur`}>{t('launchWall')}</Link></p>
        </>
      )}
      {tab === 'ranking' && <RankingTab eventId={eventId} isOrganizer={false} userId={userId} publicVote={!!event.data?.public_vote} />}
      {chain && <ChainOverlay jury={jury} userId={userId} mode={chain} onClose={() => setChain(null)} toast={toast} />}
      {toastNode}
    </SpaceShell>
  )
}
