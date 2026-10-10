import { useEffect, useState } from 'react'
import { LANGS, useI18n, type Lang } from '../../i18n'
import { useDialog } from '../../components/useDialog'

const STEPS = [
  { emoji: '📸', key: 'ob1' },
  { emoji: '⚖️', key: 'ob2' },
  { emoji: '🏆', key: 'ob3' },
] as const

const STORAGE_KEY = 'cg-onboarded'

export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/** Trois écrans de bienvenue (prototype : ob1 à ob3), avec choix de la langue. Ferme avec « Passer », Échap ou le dernier bouton. */
export default function Onboarding({ onClose }: { onClose: () => void }) {
  const { t, lang, setLang } = useI18n()
  const [i, setI] = useState(0)
  const last = i === STEPS.length - 1
  const step = STEPS[i]

  const close = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // ignoré : l'écran réapparaîtra à la prochaine visite
    }
    onClose()
  }

  const dialog = useDialog<HTMLDivElement>(close)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && i < STEPS.length - 1) setI(i + 1)
      else if (e.key === 'ArrowLeft' && i > 0) setI(i - 1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  return (
    <div className="ob" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="ob-card" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="obTitle" tabIndex={-1}>
        <div className="ob-art">
          <label className="ob-lang">
            <span aria-hidden="true">🌐</span>
            <span className="sr">{t('langLabel')}</span>
            <select value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
              {LANGS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>
          </label>
          <span className="ring" aria-hidden="true" />
          <span className="emo" key={i} aria-hidden="true">{step.emoji}</span>
        </div>
        <div className="ob-txt">
          <span className="step">{t('step', { i: i + 1, n: STEPS.length })}</span>
          <h2 id="obTitle">{t(step.key + 't')}</h2>
          <p>{t(step.key)}</p>
        </div>
        <div className="ob-foot">
          <div className="ob-dots" aria-hidden="true">
            {STEPS.map((_, n) => <i key={n} className={n === i ? 'on' : ''} />)}
          </div>
          {!last && <button type="button" className="btn ghost small" onClick={close}>{t('skip')}</button>}
          <button type="button" className="btn small" data-autofocus onClick={() => (last ? close() : setI(i + 1))}>
            {last ? t('letsgo') : t('next')}
          </button>
        </div>
      </div>
    </div>
  )
}
