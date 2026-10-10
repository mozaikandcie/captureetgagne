import { useEffect, useRef } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Comportement clavier d'une fenêtre de dialogue :
 * - le focus entre dans la fenêtre (élément `data-autofocus` en priorité) ;
 * - Tab et Maj+Tab restent à l'intérieur ;
 * - Échap ferme ;
 * - à la fermeture, le focus retourne au bouton qui l'avait ouverte (sinon au contenu principal).
 */
export function useDialog<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null)
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusables = () => [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.offsetParent !== null || n === document.activeElement)

    ;(el.querySelector<HTMLElement>('[data-autofocus]') ?? focusables()[0] ?? el).focus()

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.stopPropagation(); close.current(); return }
      if (e.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) { e.preventDefault(); return }
      const first = items[0], last = items[items.length - 1]
      if (e.shiftKey && (document.activeElement === first || !el!.contains(document.activeElement))) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && (document.activeElement === last || !el!.contains(document.activeElement))) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      if (opener && opener.isConnected && opener !== document.body) opener.focus()
      else document.getElementById('main')?.focus()
    }
  }, [])

  return ref
}
