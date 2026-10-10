import { useEffect, useState } from 'react'

// Le navigateur propose l'installation une seule fois, très tôt : l'événement est gardé dès le chargement du module.
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallPromptEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferred = e as InstallPromptEvent
  notify()
})
window.addEventListener('appinstalled', () => {
  deferred = null
  notify()
})

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

/** iPhone et iPad : pas d'invite automatique, il faut passer par « Partager > Sur l'écran d'accueil ». */
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

export function useInstall() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const l = () => setTick((n) => n + 1)
    listeners.add(l)
    return () => void listeners.delete(l)
  }, [])
  return {
    installed: isStandalone(),
    canPrompt: deferred !== null,
    ios: isIOS(),
    async install() {
      if (!deferred) return
      await deferred.prompt()
      await deferred.userChoice
      deferred = null
      notify()
    },
  }
}
