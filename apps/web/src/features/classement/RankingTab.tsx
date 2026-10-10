import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { localized } from '../../lib/me'
import { useI18n } from '../../i18n'
import { isProvisional, missingByJuror, type RankRow } from './status'

interface Prize { challengeId: string; participantName: string; kind: string; url: string | null; note: number }
interface PublicTop { name: string; votes: number; kind: string; url: string | null }

const fmt1 = (n: number) => n.toFixed(1).replace('.', ',')

/** Classement général, état provisoire/définitif, prix par défi, Prix du public, prix « Assidu ». */
export default function RankingTab({ eventId, isOrganizer, userId, publicVote }: { eventId: string; isOrganizer: boolean; userId: string; publicVote: boolean }) {
  const { t, lang } = useI18n()
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)

  const data = useQuery({
    queryKey: ['ranking', eventId],
    refetchInterval: 15000,
    queryFn: async () => {
      const [standings, pending, ok, staff, scores, challenges, prizes, pub] = await Promise.all([
        supabase.rpc('standings', { p_event: eventId }),
        supabase.from('entries').select('id', { count: 'exact', head: true }).eq('event_id', eventId).eq('status', 'pending'),
        supabase.from('entries').select('id').eq('event_id', eventId).eq('status', 'ok'),
        supabase.from('staff').select('user_id, label').eq('event_id', eventId).eq('role', 'juror'),
        supabase.from('scores').select('entry_id, juror_id'),
        supabase.from('challenges').select('id, title').eq('event_id', eventId).order('position'),
        supabase.rpc('challenge_prizes', { p_event: eventId }),
        publicVote ? supabase.rpc('public_prize', { p_event: eventId }) : Promise.resolve({ data: [], error: null }),
      ])
      for (const r of [standings, pending, ok, staff, scores, challenges, prizes, pub]) if (r.error) throw r.error

      const paths = [...(prizes.data ?? []).map((p: { storage_path: string }) => p.storage_path)]
      const pubIds = (pub.data ?? []).map((p: { entry_id: string }) => p.entry_id)
      const pubEntries = pubIds.length ? (await supabase.from('entries').select('id, kind, storage_path').in('id', pubIds)).data ?? [] : []
      paths.push(...pubEntries.map((e) => e.storage_path as string))
      const signed = paths.length ? await supabase.storage.from('media').createSignedUrls(paths, 3600) : { data: [] }
      const urls = new Map((signed.data ?? []).map((u) => [u.path, u.signedUrl]))

      const rows: RankRow[] = (standings.data ?? []).map((r: Record<string, unknown>) => ({
        participantId: r.participant_id as string, displayName: r.display_name as string, done: r.done as number,
        jury: Number(r.jury), top: Number(r.top), missing: r.missing as number, score: Number(r.score ?? 0),
      }))
      const okIds = (ok.data ?? []).map((e) => e.id)
      const allScores = (scores.data ?? []).map((s) => ({ entryId: s.entry_id as string, jurorId: s.juror_id as string }))
      const byJuror = isOrganizer
        ? missingByJuror(okIds, allScores, (staff.data ?? []).map((s) => ({ id: s.user_id, label: s.label })))
        : missingByJuror(okIds, allScores, [{ id: userId, label: t('you') }])
      const prizeList: Prize[] = (prizes.data ?? []).map((p: Record<string, unknown>) => ({
        challengeId: p.challenge_id as string, participantName: p.display_name as string, kind: p.kind as string,
        url: urls.get(p.storage_path as string) ?? null, note: Number(p.note),
      }))
      const publicTop: PublicTop[] = (pub.data ?? []).map((p: Record<string, unknown>) => {
        const e = pubEntries.find((x) => x.id === p.entry_id)
        return { name: p.display_name as string, votes: p.votes as number, kind: (e?.kind as string) ?? 'photo', url: e ? urls.get(e.storage_path as string) ?? null : null }
      })
      return {
        rows, pendingCount: pending.count ?? 0, byJuror, prizes: prizeList, publicTop,
        challenges: (challenges.data ?? []).map((c) => ({ id: c.id, title: c.title as Record<string, string> })),
      }
    },
  })

  if (data.isLoading) return <p role="status">{t('loading')}</p>
  if (data.isError || !data.data) return <p role="alert" className="err">{t('netError')}</p>
  const { rows, pendingCount, byJuror, prizes, publicTop, challenges } = data.data
  const provisional = isProvisional(rows, pendingCount)
  const total = challenges.length
  const complete = rows.filter((r) => r.done === total && total > 0)
  const closest = [...rows].sort((a, b) => b.done - a.done)[0]

  async function sendRanks() {
    setMessage(null)
    const { data: n, error } = await supabase.rpc('notify_ranks', { p_event: eventId })
    setMessage(error ? { text: t('ranksFailed'), error: true } : { text: t('ranksSent', { n: n as number }), error: false })
  }

  const thumb = (kind: string, url: string | null) => url && (kind === 'photo' ? <img src={url} alt="" /> : <video src={url} muted preload="metadata" />)

  return (
    <section className="stack">
      <div className="box">
        <div className="row">
          <h2 className="grow">{t('rankGeneral')}</h2>
          {isOrganizer && <button type="button" className="btn small" onClick={() => void sendRanks()}>{provisional ? t('sendRanksAnyway') : t('sendRanksBtn')}</button>}
        </div>
        {message && <p role={message.error ? 'alert' : 'status'} className={message.error ? 'err' : 'ok'}>{message.text}</p>}
        <div className={provisional ? 'scheck warn' : 'scheck ok'} role="status">
          {provisional ? (
            <>
              <b>{t('checkProv')}</b><span>{t('checkBefore')}</span>
              <ul>
                {pendingCount > 0 && <li>{t('toModerateCount', { n: pendingCount })}</li>}
                {byJuror.filter((j) => j.missing > 0).map((j) => <li key={j.jurorId}>{t('jurorToScore', { name: j.label, n: j.missing })}</li>)}
              </ul>
            </>
          ) : <><b>{t('checkFinal')}</b><span>{t('checkFinalText')}</span></>}
        </div>
        <p className="formula">{t('formula')}</p>
        <div className="tbl">
          <table className="rank">
            <thead><tr>
              <th>#</th><th>{t('colName')}</th><th className="nr">{t('colDone')}</th><th className="nr">{t('colJuryOn10')}</th><th className="nr">{t('colScore')}</th><th>{t('colNotes')}</th>
            </tr></thead>
            <tbody>
              {rows.map((r, i) => {
                const tie = (rows[i - 1] && rows[i - 1].score === r.score) || (rows[i + 1] && rows[i + 1].score === r.score)
                return (
                  <tr key={r.participantId} className={i === 0 ? 'first' : ''}>
                    <td className="rankn">{i + 1}</td>
                    <td>{r.displayName}{tie && <span className="pill wait" title={t('tieNote')}> {t('tieNote')}</span>}</td>
                    <td className="nr">{r.done}/{total}</td>
                    <td className="nr">{fmt1(r.jury)}</td>
                    <td className="nr"><b>{fmt1(r.score)}</b></td>
                    <td>{r.done ? (r.missing ? <span className="miss">{t('notesIncomplete', { n: r.missing })}</span> : <span className="okc">{t('notesComplete')}</span>) : '–'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="box">
        <h2>{t('prizesPerChallenge')}</h2>
        <div className="prizes">
          {challenges.map((c) => {
            const p = prizes.find((x) => x.challengeId === c.id)
            return (
              <div key={c.id} className="prize">
                {p ? thumb(p.kind, p.url) : <div className="vid off">?</div>}
                <div><small>{localized(c.title, lang)}</small><b>{p ? p.participantName : t('noWinner')}</b>{p && <small>{fmt1(p.note)}/10</small>}</div>
              </div>
            )
          })}
        </div>
      </div>

      {publicVote && (
        <div className="box">
          <h2>{t('public')}</h2>
          {publicTop.length === 0 ? <p className="empty">{t('noVotes')}</p> : (
            <div className="prizes">
              {publicTop.map((p, i) => (
                <div key={i} className="prize">
                  {thumb(p.kind, p.url)}
                  <div><small>{i === 0 ? t('firstLead') : i === 1 ? '2e' : '3e'}</small><b>{p.name}</b><small>{t('publicVotes', { n: p.votes })}</small></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="box">
        <h3>{t('assiduTitle')}</h3>
        <p className="help">
          {complete.length ? t('assiduSome', { names: complete.map((r) => r.displayName).join(', ') })
            : t('assiduNone', { n: total, name: closest?.displayName ?? '–' })}
        </p>
      </div>
    </section>
  )
}
