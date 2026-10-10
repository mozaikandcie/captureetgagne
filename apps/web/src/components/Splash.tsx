import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { useDialog } from './useDialog'

const KEY = 'cg-splash'

/** Écran d'ouverture (une fois par visite). Le titre reste « Capture et Gagne » en français (CLAUDE.md). */
export function splashSeen(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export default function Splash({ onDone }: { onDone: () => void }) {
  const { t } = useI18n()
  const [leaving, setLeaving] = useState(false)
  const finished = useRef(false)

  const finish = () => {
    if (finished.current) return
    finished.current = true
    try {
      sessionStorage.setItem(KEY, '1')
    } catch {
      // ignoré
    }
    onDone()
  }
  const close = () => {
    setLeaving(true)
    setTimeout(finish, 400)
  }

  const dialog = useDialog<HTMLDivElement>(close)

  // Se ferme seul après l'animation (3,4 s + 0,6 s de sortie).
  useEffect(() => {
    const timer = setTimeout(finish, 4000)
    return () => clearTimeout(timer)
  })

  return (
    <div ref={dialog} tabIndex={-1} className={leaving ? 'splash gone' : 'splash'} role="dialog" aria-modal="true" aria-label="Capture et Gagne, Ambyans Twopikal" onClick={close}>
      <div className="sp-flash" aria-hidden="true" />
      <div className="sp-center">
        <div className="sp-lens"><img src="/logo.png" alt="" /></div>
        <p className="sp-title" role="heading" aria-level={1}>
          <span className="w1">Capture</span> <span className="w2">et</span> <span className="w3">Gagne</span>
        </p>
        <p className="sp-asso"><span>{t('spPresented')}</span>Ambyans Twopikal</p>
      </div>
      <button type="button" className="sp-skip" data-autofocus onClick={(e) => { e.stopPropagation(); close() }}>{t('enter')}</button>
    </div>
  )
}
