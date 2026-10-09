import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n'

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

/** Trois écrans de bienvenue (prototype : ob1 à ob3). Ferme avec « Passer », Échap ou le dernier bouton. */
export default function Onboarding({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  const [i, setI] = useState(0)
  const nextRef = useRef<HTMLButtonElement>(null)
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

  useEffect(() => nextRef.current?.focus(), [i])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight' && i < STEPS.length - 1) setI(i + 1)
      else if (e.key === 'ArrowLeft' && i > 0) setI(i - 1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  return (
    <div className="ob" role="dialog" aria-modal="true" aria-labelledby="obTitle">
      <div className="ob-card">
        <div className="ob-emoji" aria-hidden="true">{step.emoji}</div>
        <p className="help">{t('step', { i: i + 1, n: STEPS.length })}</p>
        <h2 id="obTitle">{t(step.key + 't')}</h2>
        <p>{t(step.key)}</p>
        <div className="ob-dots" aria-hidden="true">
          {STEPS.map((_, n) => <i key={n} className={n === i ? 'on' : ''} />)}
        </div>
        <button ref={nextRef} type="button" className="btn" onClick={() => (last ? close() : setI(i + 1))}>
          {last ? t('letsgo') : t('next')}
        </button>
        {!last && <button type="button" className="link" onClick={close}>{t('skip')}</button>}
      </div>
    </div>
  )
}
