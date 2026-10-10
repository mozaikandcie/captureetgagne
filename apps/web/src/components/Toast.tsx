import { useCallback, useEffect, useRef, useState } from 'react'

/** Message bref en bas d'écran (annoncé aux lecteurs d'écran). */
export function useToast() {
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const toast = useCallback((text: string, error = false) => {
    setMessage({ text, error })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMessage(null), 2800)
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])
  const node = message ? <div className={message.error ? 'toast bad' : 'toast'} role={message.error ? 'alert' : 'status'}>{message.text}</div> : null
  return { toast, toastNode: node }
}
