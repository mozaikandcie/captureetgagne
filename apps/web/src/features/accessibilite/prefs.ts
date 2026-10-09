// Préférences d'accessibilité : taille du texte (bouton « A+ ») et thème. Mémorisées sur l'appareil.

export const SCALES = [1, 1.15, 1.3] as const
export type Theme = 'auto' | 'light' | 'dark'
const THEMES: Theme[] = ['auto', 'light', 'dark']

/** Taille suivante, en boucle : 100 % → 115 % → 130 % → 100 %. Une valeur inconnue repart de 100 %. */
export function nextScale(current: number): number {
  const i = SCALES.indexOf(current as (typeof SCALES)[number])
  return SCALES[(i + 1) % SCALES.length]
}

export function nextTheme(current: Theme): Theme {
  return THEMES[(THEMES.indexOf(current) + 1) % THEMES.length]
}

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    // stockage indisponible : la préférence vaut pour cette visite seulement
  }
}

export function loadScale(): number {
  const n = Number(read('cg-scale'))
  return (SCALES as readonly number[]).includes(n) ? n : 1
}

export function loadTheme(): Theme {
  const v = read('cg-theme')
  return THEMES.includes(v as Theme) ? (v as Theme) : 'auto'
}

export function applyScale(scale: number) {
  document.documentElement.style.setProperty('--scale', String(scale))
  write('cg-scale', String(scale))
}

export function applyTheme(theme: Theme) {
  if (theme === 'auto') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', theme)
  write('cg-theme', theme)
}
