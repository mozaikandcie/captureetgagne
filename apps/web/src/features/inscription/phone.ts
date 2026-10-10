/**
 * Indicatifs internationaux des mobiles d'outre-mer composés en format national (0690…, 0696…).
 * Le numéro international n'est pas +33 : +590 Guadeloupe, +594 Guyane, +596 Martinique, +262 Réunion et Mayotte.
 */
const OVERSEAS: [prefix: string, dial: string][] = [
  ['0690', '590'], ['0691', '590'], // Guadeloupe, Saint-Martin, Saint-Barthélemy
  ['0694', '594'], // Guyane
  ['0696', '596'], ['0697', '596'], // Martinique
  ['0692', '262'], ['0693', '262'], ['0639', '262'], // Réunion, Mayotte
]

/** Normalise un numéro saisi en E.164. Accepte les mobiles 06 / 07, les mobiles d'outre-mer (0690…), +33…, 0033…, +590…. `null` si invalide ou si ce n'est pas un mobile. */
export function normalizePhone(input: string): string | null {
  const raw = input.replace(/[\s.\-()]/g, '')
  if (raw.startsWith('+')) return /^\+[1-9]\d{7,14}$/.test(raw) ? raw : null
  if (raw.startsWith('00')) return normalizePhone('+' + raw.slice(2))
  if (/^0[1-9]\d{8}$/.test(raw)) {
    const overseas = OVERSEAS.find(([prefix]) => raw.startsWith(prefix))
    if (overseas) return '+' + overseas[1] + raw.slice(1)
    // Un code par SMS ne peut être reçu que sur un mobile : un fixe (01 à 05, 09) ou un numéro spécial (08) est refusé tout de suite.
    return /^0[67]/.test(raw) ? '+33' + raw.slice(1) : null
  }
  return null
}
