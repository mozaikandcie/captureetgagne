import { useEffect, useState } from 'react'
import { applyScale, applyTheme, loadScale, loadTheme, nextScale, nextTheme } from './prefs'

/** Taille du texte (« A+ ») et thème : état local, appliqué au document et mémorisé sur l'appareil. */
export function usePrefs() {
  const [scale, setScale] = useState(loadScale)
  const [theme, setTheme] = useState(loadTheme)
  useEffect(() => applyScale(scale), [scale])
  useEffect(() => applyTheme(theme), [theme])
  return {
    scale,
    theme,
    cycleScale: () => setScale(nextScale(scale)),
    cycleTheme: () => setTheme(nextTheme(theme)),
  }
}
