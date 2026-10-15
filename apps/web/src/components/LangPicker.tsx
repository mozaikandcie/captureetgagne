import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { LANGS, useI18n, type Lang } from '../i18n'

/** Drapeau de chaque langue. Une langue sans fichier (La Réunion, en attente) s'affiche avec le globe. */
const FLAGS: Partial<Record<Lang, string>> = {
  fr: '/flags/fr.svg',
  gp: '/flags/gp.png',
  mq: '/flags/mq.png',
  gf: '/flags/gf.png',
  ht: '/flags/ht.png',
}

function Flag({ lang }: { lang: Lang }) {
  const src = FLAGS[lang]
  return (
    <span className="flagbox" aria-hidden="true">
      {src ? <img className="flag" src={src} alt="" height="20" decoding="async" /> : <span className="flag-none">🌐</span>}
    </span>
  )
}

/**
 * Choix de la langue avec drapeaux (une liste native ne peut pas afficher d'images).
 * Clavier : flèches, Début/Fin, Entrée ou Espace pour choisir, Échap ou Tab pour fermer. Lecteurs d'écran : liste à choix unique.
 */
export default function LangPicker({ className = '', floating = false }: { className?: string; floating?: boolean }) {
  const { t, lang, setLang } = useI18n()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [pos, setPos] = useState<CSSProperties | undefined>()
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const current = LANGS.findIndex(([code]) => code === lang)

  useEffect(() => {
    if (!open) return
    list.current?.focus()
    const away = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [open])

  function show() {
    setActive(current)
    // Dans un cadre qui masque ce qui dépasse (écran de bienvenue), la liste flotte au-dessus, à côté du bouton.
    const r = floating ? button.current?.getBoundingClientRect() : undefined
    setPos(r ? { position: 'fixed', top: r.bottom + 6, right: window.innerWidth - r.right, left: 'auto', minWidth: 0, width: 'max-content', maxWidth: window.innerWidth - 24, maxHeight: window.innerHeight - r.bottom - 18, overflowY: 'auto' } : undefined)
    setOpen(true)
  }
  function close(refocus = true) { setOpen(false); if (refocus) button.current?.focus() }
  function choose(i: number) { setLang(LANGS[i][0]); close() }

  function onListKey(e: KeyboardEvent) {
    const last = LANGS.length - 1
    if (e.key === 'ArrowDown') setActive((i) => Math.min(last, i + 1))
    else if (e.key === 'ArrowUp') setActive((i) => Math.max(0, i - 1))
    else if (e.key === 'Home') setActive(0)
    else if (e.key === 'End') setActive(last)
    else if (e.key === 'Enter' || e.key === ' ') choose(active)
    else if (e.key === 'Escape') { e.stopPropagation(); close() }
    else if (e.key === 'Tab') close(false)
    else return
    if (e.key !== 'Tab') e.preventDefault()
  }

  return (
    <div className={`lp ${className}`} ref={root}>
      <button ref={button} type="button" id="lang" className="langsel lp-btn" aria-haspopup="listbox" aria-expanded={open}
        aria-label={`${t('langLabel')} : ${LANGS[current][1]}`}
        onClick={() => (open ? close() : show())}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); show() } }}>
        <Flag lang={lang} /><span className="lp-name">{LANGS[current][1]}</span><span aria-hidden="true" className="lp-caret">▾</span>
      </button>
      {open && (
        <ul ref={list} className="lp-list" style={pos} role="listbox" tabIndex={-1} aria-label={t('langLabel')}
          aria-activedescendant={`lang-${LANGS[active][0]}`} onKeyDown={onListKey}>
          {LANGS.map(([code, label], i) => (
            <li key={code} id={`lang-${code}`} role="option" aria-selected={code === lang}
              className={`lp-opt${i === active ? ' on' : ''}`} onPointerEnter={() => setActive(i)} onClick={() => choose(i)}>
              <Flag lang={code} /><span>{label}</span>
              {code === lang && <span aria-hidden="true" className="lp-check">✓</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
