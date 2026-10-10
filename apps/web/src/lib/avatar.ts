/** Initiales d'un nom (2 lettres au plus) : « Maëlys Joseph » → « MJ », « didier » → « D ». */
export function initials(name: string): string {
  const parts = name.trim().split(/[\s-]+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0]
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toLocaleUpperCase('fr-FR')
}

const COLORS = ['#e33e3d', '#1f8a5b', '#b4690e', '#6b4fbb', '#1a6fa8', '#a8325e']

/** Couleur stable pour un nom (la même à chaque affichage). Toutes ont un contraste suffisant avec du texte blanc. */
export function avatarColor(name: string): string {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return COLORS[h % COLORS.length]
}
