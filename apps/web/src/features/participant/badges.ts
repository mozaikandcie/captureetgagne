// Les 7 badges de la V2 (prototype). Les conditions sont calculées côté serveur (`refresh_badges`).
export const BADGES = [
  { id: 'first', icon: '📸', name: 'badgeFirst', desc: 'badgeFirstD' },
  { id: 'trio', icon: '🎯', name: 'badgeTrio', desc: 'badgeTrioD' },
  { id: 'all', icon: '🏅', name: 'badgeAll', desc: 'badgeAllD' },
  { id: 'video', icon: '🎬', name: 'badgeVideo', desc: 'badgeVideoD' },
  { id: 'nine', icon: '⭐', name: 'badgeNine', desc: 'badgeNineD' },
  { id: 'fav', icon: '❤️', name: 'badgeFav', desc: 'badgeFavD' },
  { id: 'podium', icon: '🏆', name: 'badgePodium', desc: 'badgePodiumD' },
] as const

export type BadgeId = (typeof BADGES)[number]['id']

export const badgeById = (id: string) => BADGES.find((b) => b.id === id)
