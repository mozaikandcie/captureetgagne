const pad = (n: number) => String(n).padStart(2, '0')

/** Durée restante lisible : « 12 j 04 h » (plus d'un jour), « 5 h 07 min », « 8 min 03 s ». */
export function formatRemaining(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(s / 86400)
  const hours = Math.floor((s % 86400) / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  if (days > 0) return `${days} j ${pad(hours)} h`
  if (hours > 0) return `${hours} h ${pad(minutes)} min`
  return `${minutes} min ${pad(s % 60)} s`
}

/**
 * Affiche un lot : une somme seule (« 50 », « 50€ », « 50 euros ») devient « 50 € » ; un texte libre
 * (« 1er prix : 2 places de concert ») reste tel quel.
 */
export function formatPrize(text: string): string {
  const m = /^\s*(\d+(?:[.,]\d+)?)\s*(?:€|euros?|eur)?\s*$/i.exec(text)
  return m ? `${m[1].replace('.', ',')} €` : text.trim()
}
