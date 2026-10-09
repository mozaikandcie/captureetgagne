/** Confettis sur un canvas ; renvoie la fonction d'arrêt. Désactivé si l'utilisateur réduit les animations. */
export function confetti(canvas: HTMLCanvasElement, durationMs: number): () => void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {}
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}
  canvas.width = canvas.clientWidth
  canvas.height = canvas.clientHeight
  const colors = ['#e33e3d', '#f8c96a', '#ffffff', '#1f8a5b', '#ff8a5c']
  const parts = Array.from({ length: 160 }, () => ({
    x: Math.random() * canvas.width, y: -20 - Math.random() * canvas.height * 0.5,
    vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 3, r: 4 + Math.random() * 5,
    a: Math.random() * 6, va: (Math.random() - 0.5) * 0.3, color: colors[(Math.random() * colors.length) | 0],
  }))
  let running = true
  const start = performance.now()
  const frame = (now: number) => {
    if (!running) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.a += p.va
      if (p.y > canvas.height + 20 && now - start < durationMs) { p.y = -20; p.x = Math.random() * canvas.width }
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.color
      ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore()
    }
    if (parts.some((p) => p.y < canvas.height + 20)) requestAnimationFrame(frame)
    else ctx.clearRect(0, 0, canvas.width, canvas.height)
  }
  requestAnimationFrame(frame)
  return () => { running = false; ctx.clearRect(0, 0, canvas.width, canvas.height) }
}
