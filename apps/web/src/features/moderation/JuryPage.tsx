import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useSession } from '../../lib/session'
import { localized } from '../../lib/me'
import { useI18n } from '../../i18n'
import PhoneForm from '../inscription/PhoneForm'
import { MediaView, useModerationData, type Challenge, type Row } from './data'
import NotesTab from '../notation/NotesTab'
import RankingTab from '../classement/RankingTab'
import {
  applyFilters, favoriteCount, noFilters, pendingQueue,
  type Filters, type Status,
} from './entries'


type Tab = 'queue' | 'grid' | 'notes' | 'ranking'
const TABS: [Tab, string][] = [['queue', 'tabQueue'], ['grid', 'tabGrid'], ['notes', 'tabNotes'], ['ranking', 'tabRanking']]

/** Espace jury : /jury/:eventId. Accès réservé aux comptes présents dans `staff`. */
export default function JuryPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const { t } = useI18n()
  const session = useSession()
  const [tab, setTab] = useState<Tab>('queue')

  const staff = useQuery({
    queryKey: ['staff', eventId, session?.user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff').select('role, label').eq('event_id', eventId!).eq('user_id', session!.user.id).maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!eventId && !!session,
  })

  if (session === undefined || (session && staff.isLoading)) {
    return <main className="page"><p role="status">{t('loading')}</p></main>
  }
  if (!session) {
    return <main className="page"><h1>{t('juryLogin')}</h1><PhoneForm /></main>
  }
  if (!staff.data) {
    return <main className="page"><p role="alert">{t('juryOnly')}</p></main>
  }

  return (
    <main className="page wide">
      <h1>{t('juryTitle')} · {staff.data.label}</h1>
      <div role="tablist" className="tabs">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id}
            className={tab === id ? 'tab on' : 'tab'} onClick={() => setTab(id)}>
            {t(label)}
          </button>
        ))}
      </div>
      {tab === 'notes' ? <NotesTab eventId={eventId!} userId={session.user.id} />
        : tab === 'ranking' ? <RankingTab eventId={eventId!} isOrganizer={staff.data.role === 'organizer'} />
        : <Moderation eventId={eventId!} tab={tab} />}
    </main>
  )
}

function Moderation({ eventId, tab }: { eventId: string; tab: 'queue' | 'grid' }) {
  const { t, lang } = useI18n()
  const qc = useQueryClient()
  const { challenges, entries, loading } = useModerationData(eventId)
  const [error, setError] = useState<string | null>(null)

  const title = (id: string) => localized(challenges.find((c) => c.id === id)?.title, lang)

  async function patch(id: string, values: Partial<{ status: Status; reject_reason: string | null; favorite: boolean }>) {
    setError(null)
    const { error } = await supabase.from('entries').update(values).eq('id', id)
    if (error) {
      setError(error.message.includes('coups de cœur') ? t('favLimit') : t('modFailed'))
      return false
    }
    await qc.invalidateQueries({ queryKey: ['mod-entries', eventId] })
    return true
  }

  if (loading) return <p role="status">{t('loading')}</p>

  return (
    <>
      {error && <p role="alert" className="err">{error}</p>}
      {tab === 'queue'
        ? <Queue entries={entries} title={title} onPatch={patch} />
        : <Grid entries={entries} challenges={challenges} title={title} onPatch={patch} />}
    </>
  )
}

type Patch = (id: string, v: Partial<{ status: Status; reject_reason: string | null; favorite: boolean }>) => Promise<boolean>

/** File « à la chaîne » : un seul contenu à l'écran, le suivant apparaît dès la décision. */
function Queue({ entries, title, onPatch }: { entries: Row[]; title: (id: string) => string; onPatch: Patch }) {
  const { t } = useI18n()
  const [reason, setReason] = useState<string | null>(null) // non nul = saisie du motif ouverte
  const [busy, setBusy] = useState(false)
  const pending = pendingQueue(entries)
  const current = pending[0]

  // Le motif ne doit pas passer d'un contenu au suivant.
  useEffect(() => setReason(null), [current?.id])

  if (!current) return <p role="status">{t('queueEmpty')}</p>

  async function decide(values: Parameters<Patch>[1]) {
    setBusy(true)
    await onPatch(current.id, values)
    setBusy(false)
  }

  return (
    <section>
      <p role="status">{t('toModerate', { n: pending.length })}</p>
      <h2>{title(current.challengeId)}</h2>
      <p className="help">{t('by', { n: current.participantName })}</p>
      <MediaView row={current} title={title(current.challengeId)} />
      {reason === null ? (
        <div className="row">
          <button type="button" className="btn" disabled={busy} onClick={() => void decide({ status: 'ok', reject_reason: null })}>
            {t('validate')}
          </button>
          <button type="button" className="btn ghost" disabled={busy} onClick={() => setReason('')}>
            {t('reject')}
          </button>
        </div>
      ) : (
        <div>
          <label className="f">
            <span>{t('rejectReason')}</span>
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
          </label>
          <div className="row">
            <button type="button" className="btn" disabled={busy}
              onClick={() => void decide({ status: 'rejected', reject_reason: reason.trim() || null })}>
              {t('rejectConfirm')}
            </button>
            <button type="button" className="btn ghost" onClick={() => setReason(null)}>{t('cancel')}</button>
          </div>
        </div>
      )}
    </section>
  )
}

function Grid({ entries, challenges, title, onPatch }: {
  entries: Row[]; challenges: Challenge[]; title: (id: string) => string; onPatch: Patch
}) {
  const { t, lang } = useI18n()
  const [filters, setFilters] = useState<Filters>(noFilters)
  const shown = applyFilters(entries, filters)
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters({ ...filters, [key]: value })

  return (
    <section>
      <div className="filters">
        <label className="f"><span>{t('filterStatus')}</span>
          <select value={filters.status} onChange={(e) => set('status', e.target.value as Filters['status'])}>
            <option value="all">{t('filterAll')}</option>
            <option value="pending">{t('stPending')}</option>
            <option value="ok">{t('stOk')}</option>
            <option value="rejected">{t('stRejected')}</option>
          </select></label>
        <label className="f"><span>{t('filterChallenge')}</span>
          <select value={filters.challengeId} onChange={(e) => set('challengeId', e.target.value)}>
            <option value="all">{t('filterAll')}</option>
            {challenges.map((c) => <option key={c.id} value={c.id}>{localized(c.title, lang)}</option>)}
          </select></label>
        <label className="f"><span>{t('filterKind')}</span>
          <select value={filters.kind} onChange={(e) => set('kind', e.target.value as Filters['kind'])}>
            <option value="all">{t('filterAll')}</option>
            <option value="photo">{t('tPhoto')}</option>
            <option value="video">{t('tVideo')}</option>
          </select></label>
      </div>
      <ul className="grid">
        {shown.map((row) => (
          <li key={row.id} className="card">
            <MediaView row={row} title={title(row.challengeId)} />
            <p><strong>{title(row.challengeId)}</strong><br />
              <span className="help">{t('by', { n: row.participantName })} · {t(statusKey[row.status])}</span></p>
            {row.status === 'rejected' && row.rejectReason && <p className="err">{row.rejectReason}</p>}
            <div className="row">
              {row.status !== 'ok' && <button type="button" className="link" onClick={() => void onPatch(row.id, { status: 'ok', reject_reason: null })}>{t('validate')}</button>}
              {row.status !== 'rejected' && <button type="button" className="link" onClick={() => void onPatch(row.id, { status: 'rejected' })}>{t('reject')}</button>}
              {row.status === 'ok' && (
                <button type="button" className="link" aria-pressed={row.favorite}
                  disabled={!row.favorite && favoriteCount(entries, row.kind) >= 3}
                  onClick={() => void onPatch(row.id, { favorite: !row.favorite })}>
                  {row.favorite ? '★ ' + t('favOn') : '☆ ' + t('favOff')}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

const statusKey = { pending: 'stPending', ok: 'stOk', rejected: 'stRejected' } as const
