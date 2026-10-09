import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useI18n } from '../../i18n'
import { isProvisional, missingByJuror, type RankRow } from './status'

/** Classement via la fonction SQL `standings`, statut provisoire/définitif, notes manquantes par juré. */
export default function RankingTab({ eventId, isOrganizer }: { eventId: string; isOrganizer: boolean }) {
  const { t } = useI18n()
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)

  const data = useQuery({
    queryKey: ['ranking', eventId],
    refetchInterval: 15000,
    queryFn: async () => {
      const [standings, pending, ok, staff, scores] = await Promise.all([
        supabase.rpc('standings', { p_event: eventId }),
        supabase.from('entries').select('id', { count: 'exact', head: true }).eq('event_id', eventId).eq('status', 'pending'),
        supabase.from('entries').select('id').eq('event_id', eventId).eq('status', 'ok'),
        supabase.from('staff').select('user_id, label').eq('event_id', eventId).eq('role', 'juror'),
        supabase.from('scores').select('entry_id, juror_id'),
      ])
      for (const r of [standings, pending, ok, staff, scores]) if (r.error) throw r.error
      const rows: RankRow[] = (standings.data ?? []).map((r: Record<string, unknown>) => ({
        participantId: r.participant_id as string,
        displayName: r.display_name as string,
        done: r.done as number,
        jury: Number(r.jury),
        top: Number(r.top),
        missing: r.missing as number,
        score: Number(r.score ?? 0),
      }))
      return {
        rows,
        pendingCount: pending.count ?? 0,
        // Un juré ne lit que ses propres notes : le détail par juré n'a de sens que pour l'organisation.
        byJuror: missingByJuror(
          (ok.data ?? []).map((e) => e.id),
          (scores.data ?? []).map((s) => ({ entryId: s.entry_id, jurorId: s.juror_id })),
          (staff.data ?? []).map((s) => ({ id: s.user_id, label: s.label })),
        ),
      }
    },
  })

  if (data.isLoading) return <p role="status">{t('loading')}</p>
  if (data.isError || !data.data) return <p role="alert" className="err">{t('netError')}</p>

  const { rows, pendingCount, byJuror } = data.data
  const provisional = isProvisional(rows, pendingCount)

  async function sendRanks() {
    setMessage(null)
    const { data: n, error } = await supabase.rpc('notify_ranks', { p_event: eventId })
    setMessage(error ? { text: t('ranksFailed'), error: true } : { text: t('ranksSent', { n: n as number }), error: false })
  }

  return (
    <section>
      <h2>{t('rankTitle')}</h2>
      <p role="status" className={provisional ? 'err' : undefined}>
        {provisional ? t('rankProvisional') : t('rankFinal')}
      </p>
      {pendingCount > 0 && <p className="help">{t('pendingCount', { n: pendingCount })}</p>}
      {isOrganizer && byJuror.some((j) => j.missing > 0) && (
        <>
          <h3>{t('missingByJuror')}</h3>
          <ul>
            {byJuror.map((j) => <li key={j.jurorId}>{j.label} : {t('missingNotes', { n: j.missing })}</li>)}
          </ul>
        </>
      )}
      <table className="rank">
        <thead>
          <tr>
            <th scope="col">{t('colRank')}</th><th scope="col">{t('colName')}</th>
            <th scope="col">{t('colDone')}</th><th scope="col">{t('colJury')}</th><th scope="col">{t('colScore')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.participantId}>
              <td>{i + 1}</td>
              <th scope="row">{r.displayName}{r.missing > 0 && <span className="help"> · {t('missingNotes', { n: r.missing })}</span>}</th>
              <td>{r.done}</td><td>{r.jury.toFixed(1).replace('.', ',')}</td><td>{r.score.toFixed(2).replace('.', ',')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {isOrganizer && (
        <button type="button" className="btn" onClick={() => void sendRanks()}>
          {provisional ? t('sendRanksAnyway') : t('sendRanks')}
        </button>
      )}
      {message && <p role={message.error ? 'alert' : 'status'} className={message.error ? 'err' : undefined}>{message.text}</p>}
    </section>
  )
}
