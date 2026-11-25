import { useEffect, useRef } from 'react'
import type { TraditionId } from '@aura-spec/metaplace'

interface ChromaFieldProps {
  traditions: Record<TraditionId, number>
  group: number
  virtual: number
  interaction: number
  wishHue: number
  traceHues: number[]
}

const POLE: Record<TraditionId, { angle: number; color: [string, string] }> = {
  bar: { angle: -90, color: ['#ff6a2b', '#ff2f6d'] },
  rehab: { angle: 150, color: ['#c8ff3d', '#2fbf55'] },
  atelier: { angle: 30, color: ['#5b8cff', '#ff3fb4'] },
}

/**
 * The Metaplace field: three chromatic bodies — music bar, rehab & sport,
 * art atelier — that grow with their weight, merge as interaction rises,
 * blur as the experience turns virtual and fill with people as it turns
 * collective. Traces stay as points of light.
 */
export function ChromaField({ traditions, group, virtual, interaction, wishHue, traceHues }: ChromaFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const propsRef = useRef({ traditions, group, virtual, interaction, wishHue, traceHues })
  propsRef.current = { traditions, group, virtual, interaction, wishHue, traceHues }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    let timer = 0
    let width = 0
    let height = 0
    const ratio = Math.min(2, window.devicePixelRatio || 1)

    const resize = (): void => {
      const rect = canvas.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvas.width = Math.max(1, Math.floor(width * ratio))
      canvas.height = Math.max(1, Math.floor(height * ratio))
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    const draw = (time: number): void => {
      const p = propsRef.current
      const t = time / 1000
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      context.globalCompositeOperation = 'source-over'
      context.filter = 'none'
      context.fillStyle = '#0d0d10'
      context.fillRect(0, 0, width, height)

      const cx = width / 2
      const cy = height * 0.48
      const span = Math.min(width, height)
      const spread = span * (0.34 - p.interaction * 0.2)
      context.globalCompositeOperation = 'lighter'
      context.filter = `blur(${Math.round(18 + p.virtual * 46)}px)`
      ;(Object.keys(POLE) as TraditionId[]).forEach((id, index) => {
        const pole = POLE[id]
        const weight = p.traditions[id] ?? 0.33
        const drift = reduced ? 0 : Math.sin(t * 0.21 + index * 2.1) * 0.06
        const a = ((pole.angle + drift * 57) * Math.PI) / 180
        const x = cx + Math.cos(a) * spread + (reduced ? 0 : Math.sin(t * 0.13 + index) * span * 0.02)
        const y = cy + Math.sin(a) * spread * 0.82
        const r = span * (0.16 + weight * 0.42)
        const gradient = context.createRadialGradient(x, y, 0, x, y, r)
        gradient.addColorStop(0, pole.color[0])
        gradient.addColorStop(0.45, pole.color[1])
        gradient.addColorStop(1, 'rgba(13,13,16,0)')
        context.globalAlpha = 0.55 + weight * 0.45
        context.fillStyle = gradient
        context.beginPath()
        context.arc(x, y, r, 0, Math.PI * 2)
        context.fill()
      })

      // The wish itself: a small hot core at the centre.
      const core = context.createRadialGradient(cx, cy, 0, cx, cy, span * 0.12)
      core.addColorStop(0, `hsla(${p.wishHue}, 100%, 85%, 0.9)`)
      core.addColorStop(1, `hsla(${p.wishHue}, 100%, 60%, 0)`)
      context.globalAlpha = 0.8
      context.fillStyle = core
      context.beginPath()
      context.arc(cx, cy, span * 0.12, 0, Math.PI * 2)
      context.fill()

      context.filter = 'none'
      context.globalAlpha = 1
      // People: the collective axis.
      const people = Math.round(4 + p.group * 90)
      for (let i = 0; i < people; i++) {
        const seed = Math.sin(i * 91.7) * 10000
        const fr = seed - Math.floor(seed)
        const ang = i * 2.399 + (reduced ? 0 : t * 0.03 * (i % 2 ? 1 : -1))
        const rad = span * (0.18 + fr * 0.3)
        const x = cx + Math.cos(ang) * rad
        const y = cy + Math.sin(ang) * rad * 0.7
        context.fillStyle = `rgba(255,255,255,${0.25 + fr * 0.45})`
        context.beginPath()
        context.arc(x, y, 1.1 + fr * 1.4, 0, Math.PI * 2)
        context.fill()
      }

      // Traces stay forever.
      p.traceHues.forEach((hue, i) => {
        const ang = i * 2.399 + 0.6
        const rad = span * (0.08 + (i % 5) * 0.045)
        const x = cx + Math.cos(ang) * rad
        const y = cy + Math.sin(ang) * rad
        const glow = context.createRadialGradient(x, y, 0, x, y, 14)
        glow.addColorStop(0, `hsla(${hue}, 100%, 88%, 1)`)
        glow.addColorStop(1, `hsla(${hue}, 100%, 60%, 0)`)
        context.fillStyle = glow
        context.beginPath()
        context.arc(x, y, 14, 0, Math.PI * 2)
        context.fill()
      })

      context.globalCompositeOperation = 'source-over'
      if (!reduced) frame = requestAnimationFrame(draw)
      else timer = window.setTimeout(() => (frame = requestAnimationFrame(draw)), 450)
    }
    frame = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(timer)
      observer.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className="mp-field" aria-hidden="true" />
}
