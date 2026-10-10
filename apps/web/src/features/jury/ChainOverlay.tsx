import { useEffect, useRef, useState } from 'react'
import { localized } from '../../lib/me'
import { useI18n } from '../../i18n'
import { MediaView } from '../moderation/data'
import { pendingQueue } from '../moderation/entries'
import { emptyNote, toScore, type NoteForm } from '../notation/notes'
import { moderate, saveNote } from './actions'
import ScoreFields from './ScoreFields'
import type { useJury } from './useJury'

type Jury = ReturnType<typeof useJury>
type Mode = 'mod' | 'score'

/** Modération et notation « à la chaîne » en plein écran : un contenu à la fois, glisser pour décider. */
export default function ChainOverlay({ jury, userId, mode: initial, onClose, toast }: {
  jury: Jury; userId: string; mode: Mode; onClose: () => void; toast: (text: string, error?: boolean) => void
}) {
  const { t, lang } = useI18n()
  const [mode, setMode] = useState<Mode>(initial)
  const [skipped, setSkipped] = useState<Set<string>>(new Set())
  const [reason, setReason] = useState('')
  const [note, setNote] = useState<NoteForm>(emptyNote)
  const [busy, setBusy] = useState(false)
  const card = useRef<HTMLDivElement>(null)

  const all = mode === 'mod' ? pendingQueue(jury.entries) : toScore(jury.entries, new Set(jury.myScores.keys()))
  const remaining = all.filter((e) => !skipped.has(e.id))
  const list = remaining.length ? remaining : all
  const current = list[0]
  const title = (id: string) => localized(jury.challenges.find((c) => c.id === id)?.title, lang)
  const toScoreCount = toScore(jury.entries, new Set(jury.myScores.keys())).length

  // Un nouveau contenu repart d'une note vierge (ou de la note déjà donnée).
  useEffect(() => {
    setNote(current ? jury.myScores.get(current.id) ?? emptyNote : emptyNote)
    setReason('')
  }, [current?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function act(kind: 'ok' | 'rejected' | 'skip' | 'save') {
    if (!current || busy) return
    if (kind === 'skip') { setSkipped(new Set(skipped).add(current.id)); return }
    setBusy(true)
    const error = kind === 'save' ? await saveNote(current.id, userId, note)
      : await moderate(current.id, kind, kind === 'rejected' ? reason : null)
    if (error) toast(t('modFailed'), true)
    else { toast(kind === 'ok' ? t('chainValidated') : kind === 'rejected' ? t('chainRefused') : t('toastNoteSaved')); await jury.refresh() }
    setBusy(false)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onClose()
      if ((e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).tagName === 'INPUT') {
        if (!(mode === 'score' && e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT')) return
      }
      if (mode === 'mod') {
        if (e.key === 'ArrowRight') { e.preventDefault(); void act('ok') }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); void act('rejected') }
        else if (e.key === 'ArrowDown') { e.preventDefault(); void act('skip') }
      } else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void act('save') }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  // Glisser vers la droite = valider, vers la gauche = refuser.
  useEffect(() => {
    const el = card.current
    if (!el || mode !== 'mod') return
    let x0: number | null = null, dx = 0
    const stamps = (a: number, b: number) => {
      el.querySelector<HTMLElement>('.stamp.ok')!.style.opacity = String(a)
      el.querySelector<HTMLElement>('.stamp.no')!.style.opacity = String(b)
    }
    const down = (e: PointerEvent) => { x0 = e.clientX; dx = 0; el.style.transition = 'none'; el.setPointerCapture(e.pointerId) }
    const move = (e: PointerEvent) => {
      if (x0 === null) return
      dx = e.clientX - x0
      el.style.transform = `translateX(${dx}px) rotate(${dx / 30}deg)`
      stamps(Math.max(0, Math.min(1, dx / 100)), Math.max(0, Math.min(1, -dx / 100)))
    }
    const up = () => {
      if (x0 === null) return
      x0 = null; el.style.transition = ''
      if (dx > 90) void act('ok'); else if (dx < -90) void act('rejected')
      el.style.transform = ''; stamps(0, 0)
    }
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up)
    return () => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up) }
  })

  const time = current ? new Date(current.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''

  return (
    <div className="mq" role="dialog" aria-modal="true" aria-label={mode === 'mod' ? t('chainMod') : t('chainScore')}>
      <div className="mq-top">
        <b>{mode === 'mod' ? t('chainMod') : t('chainScore')}</b>
        <span className="pill">{t('chainLeft', { n: all.length })}</span>
        <button type="button" className="btn small ghost" onClick={onClose}>{t('close')}</button>
      </div>
      <div className="mq-body">
        {!current ? (
          <div className="mq-done">
            <p className="big">{mode === 'mod' ? t('allModerated') : t('allScored')}</p>
            <p className="help">{mode === 'mod' ? t('noPending') : t('allScoredHelp')}</p>
            <div className="row">
              {mode === 'mod' && toScoreCount > 0 && <button type="button" className="btn small" onClick={() => { setMode('score'); setSkipped(new Set()) }}>{t('scoreNow', { n: toScoreCount })}</button>}
              <button type="button" className="btn small ghost" onClick={onClose}>{t('close')}</button>
            </div>
          </div>
        ) : mode === 'mod' ? (
          <>
            <div className="mq-card" ref={card}>
              <MediaView row={current} title={title(current.challengeId)} />
              <span className="stamp ok">{t('stampOk')}</span><span className="stamp no">{t('stampNo')}</span>
            </div>
            <div className="mq-meta">
              <span><b>{current.participantName}</b> · {title(current.challengeId)}</span>
              <span className="help">{t(current.kind === 'photo' ? 'tPhoto' : 'tVideo')} · {t('sentAt', { time })}</span>
            </div>
            <input type="text" className="reason" placeholder={t('refuseReason')} aria-label={t('refuseReason')} value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="mq-acts">
              <button type="button" className="btn ghost bad" disabled={busy} onClick={() => void act('rejected')}>✕ {t('reject')}</button>
              <button type="button" className="btn ghost" onClick={() => void act('skip')}>{t('skip')}</button>
              <button type="button" className="btn ok" disabled={busy} onClick={() => void act('ok')}>✓ {t('validate')}</button>
            </div>
            <p className="help center">{t('chainKeysMod')}</p>
          </>
        ) : (
          <div className="mq-score">
            <div className="mq-card"><MediaView row={current} title={title(current.challengeId)} /></div>
            <div className="side">
              <div className="mq-meta">
                <span><b>{current.participantName}</b> · {title(current.challengeId)}</span>
                <span className="help">{t(current.kind === 'photo' ? 'tPhoto' : 'tVideo')} · {t('sentAt', { time })}</span>
              </div>
              <ScoreFields id="chain" note={note} onChange={setNote} />
              <div className="row">
                <button type="button" className="btn" disabled={busy} onClick={() => void act('save')}>{t('saveNext')}</button>
                <button type="button" className="btn ghost" onClick={() => void act('skip')}>{t('skip')}</button>
              </div>
              <p className="help">{t('chainKeysScore')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
