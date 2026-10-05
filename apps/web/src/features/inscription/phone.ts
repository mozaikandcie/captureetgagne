/** Normalise un numéro saisi en E.164. Accepte 06…, 0690…, +33…, 0033…, +590…. `null` si invalide. */
export function normalizePhone(input: string): string | null {
  const raw = input.replace(/[\s.\-()]/g, '')
  if (raw.startsWith('+')) return /^\+[1-9]\d{7,14}$/.test(raw) ? raw : null
  if (raw.startsWith('00')) return normalizePhone('+' + raw.slice(2))
  // Numéro national français (métropole et outre-mer : 06, 07, 0690, 0694, 0696, 0692…)
  if (/^0[1-9]\d{8}$/.test(raw)) return '+33' + raw.slice(1)
  return null
}
