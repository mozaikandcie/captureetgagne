/** Affichette A4 à imprimer : QR code, nom de l'événement, date et lieu (reprise du prototype). Renvoie un PNG. */
export async function buildQrPoster(opts: { qrDataUrl: string; name: string; subtitle: string }): Promise<Blob> {
  const W = 1240, H = 1754
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const x = canvas.getContext('2d')!
  const load = (src: string) => new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = src })
  await document.fonts.ready

  x.fillStyle = '#fff'; x.fillRect(0, 0, W, H)
  x.fillStyle = '#e33e3d'; x.fillRect(0, 0, W, 360)
  x.fillStyle = '#f8c96a'; x.fillRect(0, 360, W, 14)
  try {
    const logo = await load('/logo.png')
    x.fillStyle = '#fff'; x.beginPath(); x.arc(W / 2, 360, 150, 0, 7); x.fill()
    x.drawImage(logo, W / 2 - 100, 360 - 116, 200, (200 * logo.height) / logo.width)
  } catch { /* logo indisponible : l'affichette reste lisible */ }
  x.textAlign = 'center'
  x.fillStyle = '#fff'; x.font = '800 96px "Bricolage Grotesque Variable", sans-serif'; x.fillText('Capture et Gagne', W / 2, 170)
  x.font = '500 40px "Figtree Variable", sans-serif'; x.fillText('Le concours photo et vidéo d’Ambyans Twopikal', W / 2, 240)
  x.fillStyle = '#2a1714'; x.font = '800 64px "Bricolage Grotesque Variable", sans-serif'; x.fillText(opts.name, W / 2, 640, W - 120)
  x.font = '500 38px "Figtree Variable", sans-serif'; x.fillStyle = '#7a625a'; x.fillText(opts.subtitle, W / 2, 705, W - 120)
  const qr = await load(opts.qrDataUrl)
  x.drawImage(qr, W / 2 - 380, 780, 760, 760)
  x.fillStyle = '#c9302f'; x.font = '800 60px "Bricolage Grotesque Variable", sans-serif'; x.fillText('Scannez pour participer !', W / 2, 1620)
  x.fillStyle = '#7a625a'; x.font = '500 30px "Figtree Variable", sans-serif'; x.fillText('Relevez les défis photo et vidéo, le jury choisit les gagnants.', W / 2, 1680)
  return new Promise((ok, ko) => canvas.toBlob((b) => (b ? ok(b) : ko(new Error('png'))), 'image/png'))
}
