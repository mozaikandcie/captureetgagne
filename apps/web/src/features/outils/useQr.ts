import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

/** QR code (data URL PNG) d'un lien, aux couleurs de la charte. */
export function useQr(text: string, width = 320): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(text, { width, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#2a1714', light: '#ffffff' } })
      .then((u) => !cancelled && setUrl(u))
      .catch(() => !cancelled && setUrl(null))
    return () => { cancelled = true }
  }, [text, width])
  return url
}
