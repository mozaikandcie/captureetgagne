import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import fr from './fr.json'
import gp from './gp.json'
import mq from './mq.json'
import gf from './gf.json'
import re from './re.json'
import ht from './ht.json'

export const LANGS = [
  ['fr', 'Français'],
  ['gp', 'Kréyòl Gwadloup'],
  ['mq', 'Kréyòl Matinik'],
  ['gf', 'Kréyòl Gwiyanè'],
  ['re', 'Kréol Rényoné'],
  ['ht', 'Kreyòl ayisyen'],
] as const

export type Lang = (typeof LANGS)[number][0]
export type Messages = Record<string, string>

const dictionaries: Record<Lang, Messages> = { fr, gp, mq, gf, re, ht }
const STORAGE_KEY = 'cg-lang'

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && saved in dictionaries) return saved as Lang
  } catch {
    // stockage indisponible : on retombe sur le français
  }
  return 'fr'
}

/** Traduit une clé ; repli sur le français, puis sur la clé elle-même. `{var}` est remplacé. */
export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const text = dictionaries[lang][key] ?? dictionaries.fr[key] ?? key
  return vars ? text.replace(/\{(\w+)\}/g, (_, v) => String(vars[v] ?? `{${v}}`)) : text
}

interface I18nValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)
  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    document.documentElement.lang = 'fr' // pas de code BCP 47 fiable pour les créoles
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      // ignoré
    }
  }, [])
  const value = useMemo<I18nValue>(
    () => ({ lang, setLang, t: (key, vars) => translate(lang, key, vars) }),
    [lang, setLang],
  )
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n doit être utilisé dans <I18nProvider>')
  return ctx
}
