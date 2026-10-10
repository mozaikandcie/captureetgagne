import { useState } from 'react'
import { localized } from '../../lib/me'
import { useI18n } from '../../i18n'
import { MediaView } from '../moderation/data'
import { applyFilters, favoriteCount, noFilters, type Filters, type Status } from '../moderation/entries'
import { emptyNote, type NoteForm } from '../notation/notes'
import { moderate, saveNote, setFavorite } from './actions'
import ScoreFields from './ScoreFields'
import type { useJury } from './useJury'

type Jury = ReturnType<typeof useJury>
type StatusFilter = Filters['status'] | 'tonote'

const STATUS: Record<Status, [string, string]> = { pending: ['stPending', 'wait'], ok: ['stOk', 'ok'], rejected: ['stRejected', 'bad'] }

/** Filtres, deux gros boutons « à la chaîne » et grille des contenus avec modération et notation sur place. */
export default function JuryGrid({ jury, userId, isJuror, onChain, toast }: {
  jury: Jury; userId: string; isJuror: boolean; onChain: (mode: 'mod' | 'score') => void; toast: (text: string, error?: boolean) => void
}) {
  const { t, lang } = useI18n()
  const [challengeId, setChallengeId] = useState('all')
  const [status, setStatus] = useState<StatusFilter>('all')

  const pending = jury.entries.filter((e) => e.status === 'pending').length
  const toScore = jury.entries.filter((e) => e.status === 'ok' && !jury.myScores.has(e.id)).length
  const title = (id: string) => localized(jury.challenges.find((c) => c.id === id)?.title, lang)

  const base = applyFilters(jury.entries, { ...noFilters, challengeId, status: status === 'tonote' ? 'ok' : status })
  const shown = (status === 'tonote' ? base.filter((e) => !jury.myScores.has(e.id)) : base)
    .sort((a, b) => Number(a.status !== 'pending') - Number(b.status !== 'pending'))

  async function act(run: () => Promise<{ message: string } | null>, ok: string) {
    const error = await run()
    if (error) return toast(error.message.includes('coups de cœur') ? t('favLimit') : t('modFailed'), true)
    toast(ok)
    await jury.refresh()
  }

  return (
    <section className="stack">
      <div className="box">
        <div className="filters">
          <div className="f"><span>{t('youAre')}</span><b>{isJuror ? t('roleJuror') : t('roleOrganizer')}</b></div>
          <label className="f"><span>{t('filterChallenge')}</span>
            <select value={challengeId} onChange={(e) => setChallengeId(e.target.value)}>
              <option value="all">{t('filterChallengeAll')}</option>
              {jury.challenges.map((c) => <option key={c.id} value={c.id}>{localized(c.title, lang)}</option>)}
            </select></label>
          <label className="f"><span>{t('filterStatus')}</span>
            <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
              <option value="all">{t('filterAll')}</option>
              <option value="pending">{t('stPending')}</option>
              {isJuror && <option value="tonote">{t('statusToScore')}</option>}
              <option value="ok">{t('stOk')}</option>
              <option value="rejected">{t('stRejected')}</option>
            </select></label>
        </div>
        <div className="qrow">
          <button type="button" className="qbtn" disabled={!pending} onClick={() => onChain('mod')}>
            <b>{pending}</b><span>{t('qModLabel')}</span><em>{t('qModGo')}</em>
          </button>
          {isJuror && (
            <button type="button" className="qbtn" disabled={!toScore} onClick={() => onChain('score')}>
              <b>{toScore}</b><span>{t('qScoreLabel')}</span><em>{t('qScoreGo')}</em>
            </button>
          )}
        </div>
        <p className="help">{t('juryNoteHelp')}</p>
      </div>

      {shown.length === 0 && <p className="empty">{t('noContent')}</p>}
      <ul className="grid">
        {shown.map((e) => (
          <Card key={e.id} id={e.id}>
            {({ note, setNote }) => {
              const [label, tone] = STATUS[e.status]
              const stat = jury.stats.get(e.id)
              const mine = jury.myScores.get(e.id)
              return (
                <article className="card">
                  <div className="media"><MediaView row={e} title={title(e.challengeId)} /><span className={`pill ${tone}`}>{t(label)}</span></div>
                  <div className="body">
                    <div className="meta">
                      <span><b>{e.participantName}</b><br />{title(e.challengeId)}</span>
                      <span className="right">
                        {stat ? <><b>{stat.avg.toFixed(1).replace('.', ',')}</b>/10<br /><span className={stat.n >= jury.jurorCount ? 'okc' : 'miss'}>{t('jurorsOf', { n: stat.n, total: jury.jurorCount })}</span></>
                          : <>{t('notScoredYet')}<br /><span className="miss">{t('jurorsOf', { n: 0, total: jury.jurorCount })}</span></>}
                      </span>
                    </div>
                    {e.status === 'pending' && (
                      <div className="row">
                        <button type="button" className="btn small ok" onClick={() => void act(() => moderate(e.id, 'ok'), t('toastValidated'))}>{t('validate')}</button>
                        <button type="button" className="btn small ghost bad" onClick={() => void act(() => moderate(e.id, 'rejected'), t('toastRefused'))}>{t('reject')}</button>
                      </div>
                    )}
                    {e.status === 'rejected' && (
                      <div className="stack">
                        {e.rejectReason && <p className="err">{e.rejectReason}</p>}
                        <button type="button" className="btn small ghost" onClick={() => void act(() => moderate(e.id, 'pending'), t('toastBackToMod'))}>{t('undoToMod')}</button>
                      </div>
                    )}
                    {e.status === 'ok' && (
                      <>
                        {isJuror && (
                          <>
                            <ScoreFields id={`g-${e.id}`} note={note ?? mine ?? emptyNote} onChange={setNote} />
                            <button type="button" className="btn small"
                              onClick={() => void act(() => saveNote(e.id, userId, note ?? mine ?? emptyNote), t('toastNoteSaved'))}>
                              {mine ? t('editMyNote') : t('saveMyNote')}
                            </button>
                          </>
                        )}
                        <div className="row">
                          <button type="button" className={e.favorite ? 'btn small star on' : 'btn small star'} aria-pressed={e.favorite}
                            disabled={!e.favorite && favoriteCount(jury.entries, e.kind) >= 3}
                            onClick={() => void act(() => setFavorite(e.id, !e.favorite), e.favorite ? t('toastFavOff') : t('toastFavOn'))}>
                            {e.favorite ? t('favOnBtn') : t('favOffBtn')}
                          </button>
                          <button type="button" className="link" onClick={() => void act(() => moderate(e.id, 'pending'), t('toastBackToMod'))}>{t('undoToMod')}</button>
                        </div>
                      </>
                    )}
                  </div>
                </article>
              )
            }}
          </Card>
        ))}
      </ul>
    </section>
  )
}

/** Garde le brouillon de note d'une carte, sans écraser celui des autres cartes. */
function Card({ id, children }: { id: string; children: (s: { note: NoteForm | undefined; setNote: (n: NoteForm) => void }) => React.ReactNode }) {
  const [note, setNote] = useState<NoteForm>()
  return <li key={id}>{children({ note, setNote })}</li>
}
