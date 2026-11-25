import type { CSSProperties, ReactNode } from 'react'
import type { DoppelgangerSpec, HealingGoalSpec } from '@aura-spec/healing-room'
import {
  ZONE_COLORS,
  lightById,
  type RoomDesign,
  type RoomStep,
  type RoomViewMode,
} from './roomDesign'

export type JourneyStage = 'lobby' | 'gallery' | 'rite' | 'centre' | 'world'

interface RoomPlanProps {
  design: RoomDesign
  view: RoomViewMode
  step: RoomStep
  lang: 'it' | 'en'
  playing: boolean
  journey: JourneyStage
  doppelganger: DoppelgangerSpec | null
  goal: HealingGoalSpec | null
  samples: number
}

/* Geometry in metres, centre of the healing room at (0, 0), y grows south. */
const R_OUT = 9.25
const R_MID = 6.7
const R_IN = 4.0
/** Chamfer wall of the corner rooms: straight, 9.85 m from the centre, spanning ±25° (PHAS plan). */
const R_CH = 9.85 / Math.cos((25 * Math.PI) / 180)
const SQ = 13.5

const EV_H = 7.62 // octagon apothem of the event station
const EV_FOCUS = 3.61
const EV_DIAMOND = 10.4

const deg = (a: number): number => (a * Math.PI) / 180
const polar = (r: number, a: number): [number, number] => [r * Math.cos(deg(a)), r * Math.sin(deg(a))]
const pt = (p: [number, number]): string => `${p[0].toFixed(3)} ${p[1].toFixed(3)}`

function arcPath(r: number, a0: number, a1: number): string {
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0
  return `M ${pt(polar(r, a0))} A ${r} ${r} 0 ${large} 1 ${pt(polar(r, a1))}`
}

function octagon(h: number): string {
  const r = h / Math.cos(deg(22.5))
  const points = Array.from({ length: 8 }, (_, i) => polar(r, 22.5 + i * 45))
  return `M ${points.map(pt).join(' L ')} Z`
}

const DIAGONALS = [45, 135, 225, 315]
const RIBS = Array.from({ length: 12 }, (_, i) => 15 + i * 30)
const SEATS = Array.from({ length: 8 }, (_, i) => 22.5 + i * 45).filter((a) => a !== 67.5 && a !== 112.5)

interface Palette {
  floor: string
  ring: string
  core: string
  rooms: string
  vestibule: string
  wall: string
  wallTop: string
  line: string
  timber: string
}

function paletteFor(view: RoomViewMode, plan: RoomDesign['plan']): Palette {
  if (view === 'plan') {
    return plan === 'rite'
      ? {
          floor: '#ffffff',
          ring: ZONE_COLORS.observation,
          core: ZONE_COLORS.healing,
          rooms: ZONE_COLORS.diagnostic,
          vestibule: ZONE_COLORS.vestibule,
          wall: '#111111',
          wallTop: '#111111',
          line: '#111111',
          timber: '#9a6a3a',
        }
      : {
          floor: '#ffffff',
          ring: ZONE_COLORS.eventObservation,
          core: ZONE_COLORS.eventFocus,
          rooms: ZONE_COLORS.eventDiagnostic,
          vestibule: ZONE_COLORS.vestibule,
          wall: '#111111',
          wallTop: '#111111',
          line: '#111111',
          timber: '#9a6a3a',
        }
  }
  return {
    floor: '#ece7de',
    ring: '#3a3633',
    core: '#d9cfbf',
    rooms: '#e9e4da',
    vestibule: '#e3ddd2',
    wall: '#d8d3ca',
    wallTop: '#fbfaf6',
    line: '#4a443e',
    timber: '#b37a45',
  }
}

/* ------------------------------------------------------------------ */
/* Layers                                                              */
/* ------------------------------------------------------------------ */

function FloorRite({ c }: { c: Palette }) {
  return (
    <g>
      <rect x={-SQ} y={-SQ} width={SQ * 2} height={SQ * 2} fill={c.rooms} />
      <rect x={-3.3} y={-15.7} width={6.6} height={2.2} fill={ZONE_COLORS.garden} />
      <rect x={-15.7} y={-3.4} width={2.2} height={6.8} fill={ZONE_COLORS.garden} />
      <rect x={SQ} y={-3.4} width={2.2} height={6.8} fill={ZONE_COLORS.garden} />
      <rect x={-6} y={9.6} width={12} height={SQ - 9.6} fill={c.vestibule} />
      {DIAGONALS.map((a) => (
        <path key={a} d={`${arcPath(R_OUT - 0.05, a - 25, a + 25)} L ${pt(polar(R_CH, a + 25))} L ${pt(polar(R_CH, a - 25))} Z`} fill={ZONE_COLORS.multimedia} />
      ))}
      <circle r={R_OUT} fill={c.ring} />
      <circle r={R_IN} fill={c.core} />
    </g>
  )
}

function FloorEvent({ c }: { c: Palette }) {
  return (
    <g>
      {DIAGONALS.map((a) => {
        const [x, y] = polar(EV_DIAMOND, a)
        return <rect key={a} x={x - 2.12} y={y - 2.12} width={4.25} height={4.25} transform={`rotate(45 ${x} ${y})`} fill={c.rooms} />
      })}
      <path d={octagon(EV_H)} fill={c.ring} />
      <circle r={EV_FOCUS} fill={c.core} />
    </g>
  )
}

function WallsRite({ c, top, low }: { c: Palette; top: boolean; low: boolean }) {
  const stroke = top ? c.wallTop : c.wall
  const w = top ? 0.34 : 0.3
  const corner = (sx: number, sy: number): string => {
    const a = Math.atan2(sy, sx) * (180 / Math.PI)
    const p0 = polar(R_OUT + 0.1, a - 25)
    const p1 = polar(R_CH, a - 25)
    const p2 = polar(R_CH, a + 25)
    const p3 = polar(R_OUT + 0.1, a + 25)
    return `M ${pt(p0)} L ${pt(p1)} L ${pt(p2)} L ${pt(p3)}`
  }
  return (
    <g fill="none" stroke={stroke} strokeWidth={w} strokeLinecap="square">
      <rect x={-SQ} y={-SQ} width={SQ * 2} height={SQ * 2} strokeWidth={w * 1.6} />
      {/* side rooms and gardens */}
      <path d={`M -3.3 -${SQ} L -3.3 -9.6 M 3.3 -${SQ} L 3.3 -9.6 M -3.3 -15.7 L 3.3 -15.7 L 3.3 -${SQ} M -3.3 -15.7 L -3.3 -${SQ}`} />
      <path d={`M -${SQ} -3.4 L -9.6 -3.4 M -${SQ} 3.4 L -9.6 3.4 M -15.7 -3.4 L -15.7 3.4 M -15.7 -3.4 L -${SQ} -3.4 M -15.7 3.4 L -${SQ} 3.4`} />
      <path d={`M ${SQ} -3.4 L 9.6 -3.4 M ${SQ} 3.4 L 9.6 3.4 M 15.7 -3.4 L 15.7 3.4 M 15.7 -3.4 L ${SQ} -3.4 M 15.7 3.4 L ${SQ} 3.4`} />
      {/* vestibule */}
      <path d={`M -6 9.4 L -6 ${SQ} M 6 9.4 L 6 ${SQ} M -1.8 9.9 L -1.8 ${SQ} M 1.8 9.9 L 1.8 ${SQ}`} />
      {/* chamfered corner rooms */}
      {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => (
        <path key={`${sx}${sy}`} d={corner(sx!, sy!)} />
      ))}
      {/* ring: outer wall with the passage to the vestibule */}
      <path d={arcPath(R_OUT, 100, 80 + 360)} />
      {low ? <path d={arcPath(R_IN, 98, 82 + 360)} strokeWidth={w * 0.8} stroke={top || c.wall === '#111111' ? stroke : '#bcd6df'} /> : null}
    </g>
  )
}

function WallsEvent({ c, top, low }: { c: Palette; top: boolean; low: boolean }) {
  const stroke = top ? c.wallTop : c.wall
  const w = top ? 0.34 : 0.3
  return (
    <g fill="none" stroke={stroke} strokeWidth={w}>
      <path d={octagon(EV_H)} strokeWidth={w * 1.5} />
      {DIAGONALS.map((a) => {
        const [x, y] = polar(EV_DIAMOND, a)
        return <rect key={a} x={x - 2.12} y={y - 2.12} width={4.25} height={4.25} transform={`rotate(45 ${x} ${y})`} />
      })}
      {low ? <circle r={EV_FOCUS} strokeWidth={w * 0.6} stroke={c.wall === '#111111' ? stroke : '#bcd6df'} /> : null}
    </g>
  )
}

function DiagramDetails({ plan, c }: { plan: RoomDesign['plan']; c: Palette }) {
  if (plan === 'event') {
    return (
      <g fill="none" stroke="#111" strokeWidth={0.07}>
        <path d={octagon(EV_H - 1)} strokeDasharray="0.5 0.35" />
        <circle r={EV_FOCUS - 0.45} strokeDasharray="0.5 0.35" />
        <circle r={5.6} stroke="#f07a20" strokeWidth={0.1} strokeDasharray="0.45 0.35" />
        {DIAGONALS.map((a) => (
          <line key={a} x1={polar(EV_DIAMOND - 1.6, a)[0]} y1={polar(EV_DIAMOND - 1.6, a)[1]} x2={polar(EV_FOCUS + 0.4, a)[0]} y2={polar(EV_FOCUS + 0.4, a)[1]} stroke="#f07a20" strokeWidth={0.1} strokeDasharray="0.45 0.35" />
        ))}
        <line x1={0} y1={EV_FOCUS} x2={0} y2={EV_H + 3} stroke="#f07a20" strokeWidth={0.1} strokeDasharray="0.45 0.35" />
      </g>
    )
  }
  return (
    <g fill="none" stroke={c.line} strokeWidth={0.06}>
      <circle r={R_MID} />
      {RIBS.map((a) => (
        <line key={a} x1={polar(R_IN, a)[0]} y1={polar(R_IN, a)[1]} x2={polar(R_OUT, a)[0]} y2={polar(R_OUT, a)[1]} />
      ))}
      {SEATS.map((a) => {
        const [x, y] = polar(7.95, a)
        return <circle key={a} cx={x} cy={y} r={0.95} strokeDasharray="0.3 0.25" />
      })}
      {RIBS.map((a) => {
        const [x, y] = polar(R_OUT - 0.35, a)
        return <rect key={`p${a}`} x={x - 0.5} y={y - 0.18} width={1} height={0.36} transform={`rotate(${a + 90} ${x} ${y})`} fill="#fff" />
      })}
    </g>
  )
}

function LightLayer({ design, view }: { design: RoomDesign; view: RoomViewMode }) {
  const light = lightById(design.light)
  const level = design.lightLevel
  const id = `hr-light-${design.light}`
  const r = design.plan === 'rite' ? R_OUT : EV_H
  return (
    <g style={{ mixBlendMode: view === 'axo' ? 'screen' : 'multiply' }}>
      <defs>
        <radialGradient id={id}>
          <stop offset="0%" stopColor={light.color} stopOpacity={0.95 * level} />
          <stop offset="55%" stopColor={light.glow} stopOpacity={0.45 * level} />
          <stop offset="100%" stopColor={light.glow} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle r={r * 1.35} fill={`url(#${id})`} opacity={view === 'plan' ? 0.55 : 1} />
      {design.light === 'skylight' || design.light === 'circadian' ? (
        <circle r={design.plan === 'rite' ? R_IN - 0.2 : EV_FOCUS - 0.2} fill="#ffffff" opacity={view === 'plan' ? 0.15 + level * 0.2 : 0.25 + level * 0.55} />
      ) : null}
    </g>
  )
}

function ObjectsFloor({ design, c, view }: { design: RoomDesign; c: Palette; view: RoomViewMode }) {
  const has = (id: RoomDesign['objects'][number]): boolean => design.objects.includes(id)
  const core = design.plan === 'rite' ? R_IN : EV_FOCUS
  const ring = design.plan === 'rite' ? R_OUT : EV_H
  const light = lightById(design.light)
  return (
    <g>
      {has('water') ? <circle r={core - 0.55} fill="#7fb7d6" opacity={0.85} stroke="#4f8db0" strokeWidth={0.06} /> : null}
      {has('disc') ? <circle r={has('water') ? core * 0.45 : core * 0.6} fill="#fbfaf6" stroke="#222" strokeWidth={0.08} /> : null}
      {has('garden')
        ? Array.from({ length: 22 }, (_, i) => {
            const a = i * (360 / 22) + 4
            if (design.plan === 'rite' && a > 70 && a < 110) return null
            const rr = ring - 0.9 - ((i * 37) % 5) * 0.12
            const [x, y] = polar(rr, a)
            return <circle key={i} cx={x} cy={y} r={0.42 + ((i * 13) % 4) * 0.08} fill={i % 3 ? '#4f9a3a' : '#7cbc56'} opacity={0.92} />
          })
        : null}
      {has('ledwall') && design.plan === 'rite'
        ? DIAGONALS.map((a) => (
            <path key={a} d={arcPath(R_OUT + 0.55, a - 22, a + 22)} stroke={view === 'plan' ? ZONE_COLORS.multimedia : light.glow} strokeWidth={0.5} fill="none" />
          ))
        : null}
      {has('ledwall') && design.plan === 'event'
        ? [0, 90, 180, 270].map((a) => {
            const [x, y] = polar(EV_H - 0.35, a)
            return <rect key={a} x={x - 1.6} y={y - 0.15} width={3.2} height={0.3} transform={`rotate(${a + 90} ${x} ${y})`} fill={light.glow} />
          })
        : null}
      {design.modules.includes('floor') ? (
        <g opacity={0.5}>
          {Array.from({ length: 9 }, (_, i) => (
            <circle key={i} r={core + 0.5 + i * 0.55} fill="none" stroke={c.line} strokeWidth={0.04} strokeDasharray="0.12 0.18" />
          ))}
        </g>
      ) : null}
      {has('talisman') ? (
        <g transform={design.plan === 'rite' ? 'translate(0 11.6)' : `translate(0 ${EV_H + 1.6})`}>
          <ellipse rx={0.55} ry={0.38} fill="#efe6da" stroke="#555" strokeWidth={0.05} />
          <rect x={-0.16} y={-0.12} width={0.32} height={0.24} fill="none" stroke="#333" strokeWidth={0.04} />
        </g>
      ) : null}
    </g>
  )
}

function seatPositions(plan: RoomDesign['plan']): Array<[number, number]> {
  if (plan === 'rite') return SEATS.map((a) => polar(7.95, a))
  return DIAGONALS.map((a) => polar(EV_DIAMOND, a))
}

function DomeLayer({ design, level }: { design: RoomDesign; level: number }) {
  const seats = seatPositions(design.plan)
  const domes = design.objects.includes('domes')
  const capsules = design.objects.includes('capsules')
  if (!domes && !capsules) return null
  return (
    <g>
      {seats.map(([x, y], i) => {
        const useDome = domes && (!capsules || i % 2 === 0)
        const shrink = Math.cos((level * Math.PI) / 2.2)
        if (useDome) {
          return <circle key={i} cx={x} cy={y} r={0.9 * shrink + 0.05} fill="#fbfaf7" stroke="#bdb6aa" strokeWidth={0.05} />
        }
        return <ellipse key={i} cx={x} cy={y} rx={1.05 * shrink + 0.05} ry={0.7 * shrink + 0.05} fill="#f1ece4" stroke="#a89d8e" strokeWidth={0.05} transform={`rotate(${(Math.atan2(y, x) * 180) / Math.PI} ${x} ${y})`} />
      })}
    </g>
  )
}

function ArchesLayer({ design, c }: { design: RoomDesign; c: Palette }) {
  if (!design.objects.includes('arches')) return null
  if (design.plan === 'event') {
    return (
      <g stroke={c.timber} strokeWidth={0.32} strokeLinecap="round" fill="none">
        {Array.from({ length: 8 }, (_, i) => i * 45 + 22.5).map((a) => (
          <line key={a} x1={polar(EV_FOCUS, a)[0]} y1={polar(EV_FOCUS, a)[1]} x2={polar(EV_H / Math.cos(deg(22.5)), a)[0]} y2={polar(EV_H / Math.cos(deg(22.5)), a)[1]} />
        ))}
        <circle r={EV_FOCUS} strokeWidth={0.22} />
      </g>
    )
  }
  return (
    <g stroke={c.timber} strokeWidth={0.36} strokeLinecap="round" fill="none">
      {RIBS.map((a) => (
        <line key={a} x1={polar(R_IN, a)[0]} y1={polar(R_IN, a)[1]} x2={polar(R_OUT, a)[0]} y2={polar(R_OUT, a)[1]} />
      ))}
      <circle r={R_IN} strokeWidth={0.26} />
    </g>
  )
}

function SoundLayer({ design, active }: { design: RoomDesign; active: boolean }) {
  const has = (id: RoomDesign['modules'][number]): boolean => design.modules.includes(id)
  const ring = design.plan === 'rite' ? 8.6 : EV_H - 1.1
  const core = design.plan === 'rite' ? R_IN : EV_FOCUS
  const cls = active ? 'hr-sound is-live' : 'hr-sound'
  return (
    <g className={cls} fill="none" stroke="#0b6bd6" strokeWidth={0.08}>
      {has('shower') ? (
        <g>
          <circle r={0.45} fill="#0b6bd6" stroke="none" />
          <circle className="hr-pulse" r={1.3} />
          <circle className="hr-pulse hr-pulse--2" r={2.2} strokeDasharray="0.25 0.2" />
        </g>
      ) : null}
      {has('ring')
        ? Array.from({ length: 8 }, (_, i) => {
            const [x, y] = polar(ring, i * 45 + 22.5)
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={0.36} fill="#0b6bd6" stroke="none" />
                <circle className="hr-pulse" cx={x} cy={y} r={0.9} />
              </g>
            )
          })
        : null}
      {has('ring') ? <circle r={ring} strokeDasharray="0.12 0.5" opacity={0.6} /> : null}
      {has('dome') ? (
        <g>
          <circle r={core + 0.9} strokeDasharray="0.6 0.25" strokeWidth={0.12} />
          {Array.from({ length: 16 }, (_, i) => {
            const [x, y] = polar(core + 0.9, i * 22.5)
            return <circle key={i} cx={x} cy={y} r={0.16} fill="#0b6bd6" stroke="none" />
          })}
        </g>
      ) : null}
      {has('walls') && design.plan === 'rite'
        ? DIAGONALS.map((a) => (
            <g key={a}>
              {[-14, 0, 14].map((d) => {
                const [x, y] = polar(R_OUT + 0.75, a + d)
                return <rect key={d} x={x - 0.7} y={y - 0.14} width={1.4} height={0.28} transform={`rotate(${a + d + 90} ${x} ${y})`} fill="#0b6bd6" stroke="none" />
              })}
              <path className="hr-pulse" d={arcPath(R_OUT - 0.4, a - 18, a + 18)} />
            </g>
          ))
        : null}
      {has('walls') && design.plan === 'event'
        ? [45, 135, 225, 315].map((a) => {
            const [x, y] = polar(EV_H, a + 22.5)
            return <rect key={a} x={x - 1} y={y - 0.14} width={2} height={0.28} transform={`rotate(${a + 22.5 + 90} ${x} ${y})`} fill="#0b6bd6" stroke="none" />
          })
        : null}
      {has('binaural')
        ? (design.plan === 'rite' ? [[-11.6, 0], [11.6, 0], [0, -11.6]] : DIAGONALS.map((a) => polar(EV_DIAMOND, a))).map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <path d="M -0.55 0.2 A 0.55 0.55 0 0 1 0.55 0.2" />
              <rect x={-0.68} y={0.1} width={0.28} height={0.42} fill="#0b6bd6" stroke="none" />
              <rect x={0.4} y={0.1} width={0.28} height={0.42} fill="#0b6bd6" stroke="none" />
            </g>
          ))
        : null}
    </g>
  )
}

function Labels({ design, lang }: { design: RoomDesign; lang: 'it' | 'en' }) {
  const t = (it: string, en: string): string => (lang === 'it' ? it : en)
  const items: Array<[number, number, string]> =
    design.plan === 'rite'
      ? [
          [0, -2.5, 'Healing Room'],
          [0, 7.4, t('Osservazione', 'Observation')],
          [-9.4, -10.4, t('Diagnostica', 'Diagnostic')],
          [9.4, -10.4, t('Diagnostica', 'Diagnostic')],
          [-9.4, 10.6, t('Trattamento', 'Treatment')],
          [9.4, 10.6, t('Trattamento', 'Treatment')],
          [0, 11.8, t('Vestibolo', 'Vestibule')],
          [0, -11.6, t('Diagnostica', 'Diagnostic')],
        ]
      : [
          [0, -2.1, t('Focus — terapia', 'Focus — therapy')],
          [0, -5.6, t('Osservazione', 'Observation')],
          ...DIAGONALS.map((a, i): [number, number, string] => {
            const [x, y] = polar(EV_DIAMOND, a)
            return [x, y + 0.2, `${t('Diagnostica', 'Diagnostic')} ${'ABCD'[i]}`]
          }),
        ]
  return (
    <g className="hr-labels">
      {items.map(([x, y, text], i) => (
        <text key={i} x={x} y={y} textAnchor="middle">
          {text}
        </text>
      ))}
    </g>
  )
}

const JOURNEY_POINT: Record<JourneyStage, { rite: [number, number]; event: [number, number] }> = {
  lobby: { rite: [0, 12.2], event: [0, EV_H + 2.4] },
  gallery: { rite: polar(7.9, 150), event: polar(5.6, 150) },
  rite: { rite: [-9.4, 9.8], event: polar(EV_DIAMOND, 135) },
  centre: { rite: [0, 2.2], event: [0, 1.6] },
  world: { rite: [0, 14.8], event: [0, EV_H + 4] },
}

function JourneyLayer({ design, journey, doppelganger, goal, samples }: Pick<RoomPlanProps, 'design' | 'journey' | 'doppelganger' | 'goal' | 'samples'>) {
  const p = JOURNEY_POINT[journey][design.plan]
  const hue = doppelganger?.hue ?? 214
  const breath = doppelganger ? 1 / Math.max(0.08, doppelganger.breathHz) : 6
  const core = design.plan === 'rite' ? R_IN : EV_FOCUS
  const sources = design.plan === 'rite' ? [[-9.4, -9.8], [9.4, -9.8], [9.4, 9.8], [-9.4, 9.8]] : DIAGONALS.map((a) => polar(EV_DIAMOND, a))
  const arrowColors = ['#3f8ff0', '#3fb34f', '#f07a20', '#9a86e8']
  return (
    <g>
      <defs>
        <radialGradient id="hr-twin" cx="38%" cy="35%">
          <stop offset="0%" stopColor={`hsl(${hue} 70% 78%)`} />
          <stop offset="60%" stopColor={`hsl(${hue} 62% 46%)`} />
          <stop offset="100%" stopColor={`hsl(${(hue + 30) % 360} 70% 28%)`} />
        </radialGradient>
        <marker id="hr-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
        </marker>
      </defs>
      {journey === 'gallery' ? (
        <path d={arcPath(design.plan === 'rite' ? 7.9 : 5.6, 120, 420)} fill="none" stroke="#3f8ff0" strokeWidth={0.16} markerEnd="url(#hr-arrow)" className="hr-walk" />
      ) : null}
      {journey === 'centre' || journey === 'world'
        ? sources.slice(0, Math.max(1, Math.min(4, samples))).map(([x, y], i) => (
            <line key={i} x1={x! * 0.82} y1={y! * 0.82} x2={x! * 0.2} y2={y! * 0.2} stroke={arrowColors[i]} strokeWidth={0.18} markerEnd="url(#hr-arrow)" />
          ))
        : null}
      {doppelganger && (journey === 'centre' || journey === 'world') ? (
        <g className="hr-twin" style={{ animationDuration: `${breath.toFixed(2)}s` }}>
          <circle r={core * (0.42 + doppelganger.complexity * 0.18)} fill="url(#hr-twin)" />
          {Array.from({ length: doppelganger.satellites }, (_, i) => {
            const [x, y] = polar(core * 0.78, (360 / doppelganger.satellites) * i)
            return <circle key={i} cx={x} cy={y} r={0.18} fill={`hsl(${hue} 70% 55%)`} />
          })}
        </g>
      ) : null}
      {goal ? <circle r={core - 0.25} fill="none" stroke={`hsl(${goal.artifact.hue} 70% 50%)`} strokeWidth={0.14} strokeDasharray={`${(goal.materialisation * 2 * Math.PI * (core - 0.25)).toFixed(2)} 99`} transform="rotate(-90)" /> : null}
      <g transform={`translate(${p[0]} ${p[1]})`} className="hr-visitor">
        <circle r={0.75} fill="#fff" stroke="#111" strokeWidth={0.12} />
        <circle r={0.3} fill="#111" />
      </g>
    </g>
  )
}

/* ------------------------------------------------------------------ */
/* Composition                                                         */
/* ------------------------------------------------------------------ */

function Layer({ z, children, viewBox, className }: { z: number; children: ReactNode; viewBox: string; className?: string }) {
  return (
    <svg className={`hr-layer${className ? ` ${className}` : ''}`} viewBox={viewBox} style={{ '--z': `${z}px` } as CSSProperties} aria-hidden="true">
      {children}
    </svg>
  )
}

export function RoomPlan({ design, view, step, lang, playing, journey, doppelganger, goal, samples }: RoomPlanProps) {
  const c = paletteFor(view, design.plan)
  const span = design.plan === 'rite' ? 17 : 14
  const viewBox = `${-span} ${-span} ${span * 2} ${span * 2}`
  const wallLayers = view === 'axo' ? 9 : 1
  const emphasis = step === 2 ? 'is-sound' : step === 3 ? 'is-character' : step === 4 ? 'is-session' : 'is-space'
  const label = lang === 'it' ? 'Pianta della Healing Room' : 'Healing Room plan'

  return (
    <div className={`hr-plan hr-plan--${view} ${emphasis}`} role="img" aria-label={label}>
      <div className="hr-stack">
        <Layer z={0} viewBox={viewBox} className="hr-layer--floor">
          {design.plan === 'rite' ? <FloorRite c={c} /> : <FloorEvent c={c} />}
          {view === 'plan' ? <DiagramDetails plan={design.plan} c={c} /> : null}
        </Layer>
        <Layer z={1} viewBox={viewBox} className="hr-layer--light">
          <LightLayer design={design} view={view} />
        </Layer>
        <Layer z={2} viewBox={viewBox} className="hr-layer--objects">
          <ObjectsFloor design={design} c={c} view={view} />
        </Layer>
        {Array.from({ length: wallLayers }, (_, i) => (
          <Layer key={`w${i}`} z={i * 5} viewBox={viewBox} className="hr-layer--walls">
            {design.plan === 'rite' ? (
              <WallsRite c={c} top={i === wallLayers - 1 && view === 'axo'} low={i < 4} />
            ) : (
              <WallsEvent c={c} top={i === wallLayers - 1 && view === 'axo'} low={i < 4} />
            )}
          </Layer>
        ))}
        {Array.from({ length: view === 'axo' ? 4 : 1 }, (_, i) => (
          <Layer key={`d${i}`} z={4 + i * 6} viewBox={viewBox} className="hr-layer--objects">
            <DomeLayer design={design} level={view === 'axo' ? i / 4 : 0} />
          </Layer>
        ))}
        <Layer z={view === 'axo' ? 52 : 0} viewBox={viewBox} className="hr-layer--objects">
          <ArchesLayer design={design} c={c} />
        </Layer>
        <Layer z={view === 'axo' ? 82 : 0} viewBox={viewBox} className="hr-layer--sound">
          <SoundLayer design={design} active={playing} />
        </Layer>
        {view === 'plan' && step !== 4 ? (
          <Layer z={0} viewBox={viewBox} className="hr-layer--labels">
            <Labels design={design} lang={lang} />
          </Layer>
        ) : null}
        <Layer z={view === 'axo' ? 24 : 0} viewBox={viewBox} className="hr-layer--journey">
          {step === 4 ? <JourneyLayer design={design} journey={journey} doppelganger={doppelganger} goal={goal} samples={samples} /> : null}
        </Layer>
      </div>
    </div>
  )
}
