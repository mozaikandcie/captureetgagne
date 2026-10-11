// Regroupement des prix par gagnant et texte du SMS. Pur (aucune API Deno) : testé par Vitest depuis apps/web.

export interface AwardsInput {
  /** Podium du classement général : rang 1 à 3. */
  podium: { participantId: string; rank: number }[]
  /** Un prix par défi (meilleure note). */
  challengePrizes: { participantId: string; title: string }[]
  /** Gagnant du Prix du public, s'il est activé. */
  publicWinnerId?: string | null
}

export interface Award {
  participantId: string
  rank: number | null
  challenges: string[]
  publicPrize: boolean
}

/** Un seul SMS par personne, même si elle cumule plusieurs prix. Ordre : podium (1er d'abord), puis ordre d'apparition. */
export function groupAwards(input: AwardsInput): Award[] {
  const byPerson = new Map<string, Award>()
  const get = (id: string) => {
    let a = byPerson.get(id)
    if (!a) { a = { participantId: id, rank: null, challenges: [], publicPrize: false }; byPerson.set(id, a) }
    return a
  }
  for (const p of input.podium) get(p.participantId).rank = p.rank
  for (const c of input.challengePrizes) {
    const a = get(c.participantId)
    if (!a.challenges.includes(c.title)) a.challenges.push(c.title)
  }
  if (input.publicWinnerId) get(input.publicWinnerId).publicPrize = true
  return [...byPerson.values()].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
}

const join = (items: string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`)
const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

export function firstName(displayName: string): string {
  return short(displayName.trim().split(/\s+/)[0] ?? '', 20)
}

export function buildMessage(displayName: string, a: Award): string {
  const items: string[] = []
  if (a.rank) items.push(a.rank === 1 ? 'la 1re place du concours' : `la ${a.rank}e place du concours`)
  if (a.publicPrize) items.push('le Prix du public')
  if (a.challenges.length === 1) items.push(`le prix du défi « ${short(a.challenges[0], 30)} »`)
  else if (a.challenges.length > 1) items.push(`les prix des défis ${join(a.challenges.map((c) => `« ${short(c, 30)} »`))}`)
  return `Capture et Gagne : bravo ${firstName(displayName)} ! Tu remportes ${join(items)}. Passe voir l'équipe Ambyans pour récupérer ton lot.`
}

/** Numéro d'affichage masqué (06 ** ** ** 81) à partir du format Auth (33685821481). */
export function maskPhone(phone: string): string {
  if (!phone.startsWith('33')) return `+${phone.slice(0, 3)} ** ** ** ${phone.slice(-2)}`
  return `0${phone[2]} ** ** ** ${phone.slice(-2)}`
}
