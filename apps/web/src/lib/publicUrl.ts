// Adresse publique de l'application, celle que les participants peuvent ouvrir depuis leur téléphone.
// Elle ne doit pas dépendre de l'endroit où l'organisateur ouvre son espace (localhost, réseau local…).

declare const __PUBLIC_URL__: string // injecté par vite.config.ts (VITE_PUBLIC_URL, sinon l'adresse de production Vercel)

/** Adresse que seul cet ordinateur ou ce Wi-Fi peut ouvrir : inutile dans un QR code imprimé. */
export function isLocalAddress(url: string): boolean {
  try {
    const host = new URL(url).hostname
    return (
      host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host.endsWith('.local') ||
      /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    )
  } catch {
    return true
  }
}

/** Base des liens à partager : l'adresse publique configurée, à défaut celle de la page courante. */
export function publicBase(origin: string = location.origin, configured: string = typeof __PUBLIC_URL__ === 'string' ? __PUBLIC_URL__ : ''): string {
  return (configured || origin).replace(/\/+$/, '')
}

/** Lien d'inscription d'un événement. */
export const eventLink = (eventId: string, base: string = publicBase()) => `${base}/e/${eventId}`
