import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import {
  ASSISTANTS,
  AUDIENCES,
  FIELDS,
  MEDIA,
  MORE,
  PHASES,
  PLAN_TIERS,
  TRACE_KINDS,
  TRADITIONS,
  VENUES,
  WISH_EXAMPLES,
  composePlan,
  depositTrace,
  parseWish,
  pick,
  readModulation,
  type HealingRoomLink,
  type TraditionId,
} from '@aura-spec/metaplace'
import { useStudioStore } from '../state/store'
import { SystemBar } from '../system/SystemBar'
import { ROOM_OBJECTS, SOUND_MODULES, lightById, planById, useRoomDesign } from '../healing/roomDesign'
import { ChromaField } from './ChromaField'
import { MetaplaceAudio } from './metaplaceAudio'
import { useMetaplace, type MetaStep } from './metaplaceStore'
import './metaplace.css'

const STEPS: Array<{ id: MetaStep; it: string; en: string }> = [
  { id: 'wish', it: 'Performing Wish', en: 'Performing Wish' },
  { id: 'modulate', it: 'Modulazione', en: 'Modulation' },
  { id: 'plan', it: 'Piano di Improvement', en: 'Improvement plan' },
  { id: 'traces', it: 'Tracce', en: 'Traces' },
]

/* Triangle poles, consistent with the chromatic field: bar top, rehab bottom-left, atelier bottom-right. */
const TRI: Record<TraditionId, [number, number]> = {
  bar: [0, -1],
  rehab: [Math.cos((150 * Math.PI) / 180), Math.sin((150 * Math.PI) / 180)],
  atelier: [Math.cos((30 * Math.PI) / 180), Math.sin((30 * Math.PI) / 180)],
}

function toBarycentric(x: number, y: number): Record<TraditionId, number> {
  const [x1, y1] = TRI.bar
  const [x2, y2] = TRI.rehab
  const [x3, y3] = TRI.atelier
  const det = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3)
  let a = ((y2 - y3) * (x - x3) + (x3 - x2) * (y - y3)) / det
  let b = ((y3 - y1) * (x - x3) + (x1 - x3) * (y - y3)) / det
  let c = 1 - a - b
  a = Math.max(0, a)
  b = Math.max(0, b)
  c = Math.max(0, c)
  const sum = a + b + c || 1
  return { bar: a / sum, rehab: b / sum, atelier: c / sum }
}

function fromBarycentric(w: Record<TraditionId, number>): [number, number] {
  return [
    w.bar * TRI.bar[0] + w.rehab * TRI.rehab[0] + w.atelier * TRI.atelier[0],
    w.bar * TRI.bar[1] + w.rehab * TRI.rehab[1] + w.atelier * TRI.atelier[1],
  ]
}

function TraditionTriangle({ lang }: { lang: 'it' | 'en' }) {
  const modulation = useMetaplace((s) => s.modulation)
  const setModulation = useMetaplace((s) => s.setModulation)
  const svg = useRef<SVGSVGElement | null>(null)
  const read = readModulation(modulation)
  const [px, py] = fromBarycentric(read.traditions)

  const move = (event: ReactPointerEvent<SVGSVGElement>): void => {
    const el = svg.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 2.2 - 1.1
    const y = ((event.clientY - rect.top) / rect.height) * 1.75 - 1.1
    setModulation({ ...modulation, traditions: toBarycentric(x, y) })
  }

  const label = (id: TraditionId): string => pick(TRADITIONS.find((t) => t.id === id)!.label, lang)

  return (
    <div className="mp-tri">
      <svg
        ref={svg}
        viewBox="-1.1 -1.1 2.2 1.75"
        role="slider"
        aria-label={lang === 'it' ? 'Miscela delle tre tradizioni' : 'Blend of the three traditions'}
        aria-valuetext={`${label('bar')} ${Math.round(read.traditions.bar * 100)}%, ${label('rehab')} ${Math.round(read.traditions.rehab * 100)}%, ${label('atelier')} ${Math.round(read.traditions.atelier * 100)}%`}
        tabIndex={0}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          move(e)
        }}
        onPointerMove={(e) => {
          if (e.buttons) move(e)
        }}
        onKeyDown={(e) => {
          const step = 0.08
          const dirs: Record<string, [number, number]> = { ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0] }
          const d = dirs[e.key]
          if (!d) return
          e.preventDefault()
          setModulation({ ...modulation, traditions: toBarycentric(px + d[0], py + d[1]) })
        }}
      >
        <defs>
          <linearGradient id="mp-tri-fill" x1="0" y1="-1" x2="0" y2="0.6" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ff6a2b" stopOpacity="0.35" />
            <stop offset="1" stopColor="#5b8cff" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <polygon points={[TRI.bar, TRI.rehab, TRI.atelier].map((p) => p.join(',')).join(' ')} fill="url(#mp-tri-fill)" stroke="#2440d8" strokeWidth={0.02} />
        {(['bar', 'rehab', 'atelier'] as TraditionId[]).map((id) => (
          <line key={id} x1={px} y1={py} x2={TRI[id][0]} y2={TRI[id][1]} stroke="#2440d8" strokeWidth={0.008} strokeDasharray="0.03 0.03" />
        ))}
        <circle cx={px} cy={py} r={0.085} fill="#2440d8" stroke="#fff" strokeWidth={0.025} />
      </svg>
      {(['bar', 'rehab', 'atelier'] as TraditionId[]).map((id) => (
        <span key={id} className={`mp-tri-label mp-tri-label--${id}`}>
          <strong>{label(id)}</strong> {Math.round(read.traditions[id] * 100)}%
        </span>
      ))}
    </div>
  )
}

function MoreRadar({ values, lang }: { values: Record<string, number>; lang: 'it' | 'en' }) {
  const n = MORE.length
  const point = (i: number, r: number): [number, number] => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    return [Math.cos(a) * r, Math.sin(a) * r]
  }
  const poly = MORE.map((m, i) => point(i, 0.15 + (values[m.id] ?? 0) * 0.85).join(',')).join(' ')
  return (
    <svg viewBox="-1.25 -1.15 2.5 2.3" className="mp-radar" role="img" aria-label={lang === 'it' ? 'Profilo del Più' : 'Profile of More'}>
      {[0.33, 0.66, 1].map((r) => (
        <polygon key={r} points={MORE.map((_, i) => point(i, r).join(',')).join(' ')} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth={0.008} />
      ))}
      {MORE.map((_, i) => {
        const [x, y] = point(i, 1)
        return <line key={i} x1={0} y1={0} x2={x} y2={y} stroke="rgba(255,255,255,0.12)" strokeWidth={0.008} />
      })}
      <polygon points={poly} fill="url(#mp-radar-fill)" stroke="#fff" strokeWidth={0.014} />
      <defs>
        <linearGradient id="mp-radar-fill" x1="-1" y1="-1" x2="1" y2="1">
          <stop offset="0" stopColor="#c8ff3d" stopOpacity="0.75" />
          <stop offset="0.5" stopColor="#ff3fb4" stopOpacity="0.6" />
          <stop offset="1" stopColor="#2f5bff" stopOpacity="0.75" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function MetaplaceView() {
  const lang = useStudioStore((s) => s.lang)
  const setAppView = useStudioStore((s) => s.setAppView)
  const room = useRoomDesign((s) => s.design)

  const step = useMetaplace((s) => s.step)
  const setStep = useMetaplace((s) => s.setStep)
  const wishText = useMetaplace((s) => s.wishText)
  const setWish = useMetaplace((s) => s.setWish)
  const proposeFromWish = useMetaplace((s) => s.proposeFromWish)
  const modulation = useMetaplace((s) => s.modulation)
  const setModulation = useMetaplace((s) => s.setModulation)
  const tier = useMetaplace((s) => s.tier)
  const setTier = useMetaplace((s) => s.setTier)
  const disabledFields = useMetaplace((s) => s.disabledFields)
  const toggleField = useMetaplace((s) => s.toggleField)
  const useHealingRoom = useMetaplace((s) => s.useHealingRoom)
  const setUseHealingRoom = useMetaplace((s) => s.setUseHealingRoom)
  const traces = useMetaplace((s) => s.traces)
  const setTraces = useMetaplace((s) => s.setTraces)
  const reset = useMetaplace((s) => s.reset)

  const [playing, setPlaying] = useState(false)
  const audio = useRef<MetaplaceAudio | null>(null)
  const tt = (it: string, en: string): string => (lang === 'it' ? it : en)

  const wish = useMemo(() => parseWish(wishText), [wishText])
  const healingLink: HealingRoomLink | null = useMemo(
    () =>
      useHealingRoom
        ? {
            name: pick(planById(room.plan).label, lang),
            soundModules: room.modules.length,
            objects: room.objects.length,
            light: room.light,
          }
        : null,
    [useHealingRoom, room, lang],
  )
  const plan = useMemo(
    () => composePlan(wish, modulation, tier, { disabledFields, healing: healingLink }),
    [wish, modulation, tier, disabledFields, healingLink],
  )
  const mod = plan.modulation
  const planTraces = traces.filter((t) => t.planId === plan.id)

  useEffect(() => {
    audio.current?.update(mod.traditions, mod.virtual)
  }, [mod])
  useEffect(() => () => audio.current?.stop(), [])

  const toggleAudio = async (): Promise<void> => {
    if (playing) {
      audio.current?.stop()
      setPlaying(false)
      return
    }
    try {
      audio.current = audio.current ?? new MetaplaceAudio()
      await audio.current.start(mod.traditions, mod.virtual)
      setPlaying(true)
    } catch {
      setPlaying(false)
    }
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step)
  const next = STEPS[stepIndex + 1]
  const prev = STEPS[stepIndex - 1]
  const showAssistants = step === 'plan' || step === 'traces'

  const exportPlan = (): void => {
    const lines = [
      `METAPLACE — ${tt('Piano di Improvement', 'Improvement plan')} (${pick(PLAN_TIERS.find((p) => p.id === tier)!.label, lang)})`,
      tt('Concept e design DNA: Lorenzo Brusci · MUSI-CO', 'Concept and design DNA: Lorenzo Brusci · MUSI-CO'),
      '',
      `Performing Wish: “${wish.text}”`,
      `${tt('Mezzo', 'Medium')}: ${pick(MEDIA[wish.medium], lang)} · ${tt('Pubblico', 'Audience')}: ${pick(AUDIENCES[wish.audience], lang)} · ${tt('Traccia', 'Trace')}: ${pick(TRACE_KINDS[wish.trace], lang)}`,
      `${TRADITIONS.map((t) => `${pick(t.label, lang)} ${Math.round(mod.traditions[t.id] * 100)}%`).join(' · ')}`,
      `${tt('Gruppo', 'Group')} ${Math.round(mod.group * 100)}% · ${tt('Virtuale', 'Virtual')} ${Math.round(mod.virtual * 100)}% · ${tt('Interazione', 'Interaction')} ${Math.round(mod.interaction * 100)}%`,
      '',
      ...plan.sessions.map(
        (s) =>
          `${String(s.index + 1).padStart(2, '0')}  ${pick(PHASES[s.phase], lang).padEnd(12)} ${pick(FIELDS.find((f) => f.id === s.field)!.label, lang)} — ${pick(VENUES[s.venue], lang)}, ${s.minutes}′ — ${s.assistants.map((a) => pick(ASSISTANTS[a].label, lang)).join(', ')}`,
      ),
      '',
      tt('Il System propone, la persona decide. Nessun dato biometrico reale.', 'The System proposes, the person decides. No real biometric data.'),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'metaplace-improvement-plan.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mp-shell" lang={lang}>
      <SystemBar
        place="metaplace"
        actions={
          <button type="button" className={`mp-listen${playing ? ' is-on' : ''}`} aria-pressed={playing} onClick={() => void toggleAudio()}>
            <i aria-hidden="true" />
            {playing ? tt('In ascolto', 'Listening') : tt('Ascolta il luogo', 'Listen to the place')}
          </button>
        }
      />

      <div className="mp-body">
        <aside className="mp-rail">
          <ol className="mp-steps">
            {STEPS.map((item, index) => (
              <li key={item.id}>
                <button type="button" className={step === item.id ? 'is-active' : index < stepIndex ? 'is-done' : ''} onClick={() => setStep(item.id)}>
                  <span>{String.fromCharCode(65 + index)}</span>
                  {tt(item.it, item.en)}
                </button>
              </li>
            ))}
          </ol>

          {step === 'wish' ? (
            <section className="mp-page">
              <h1>{tt('Qual è il tuo Performing Wish?', 'What is your Performing Wish?')}</h1>
              <p className="mp-lede">
                {tt(
                  'Come vorresti esprimerti ed esibirti, per una piccola o una grande cerchia di altri? Tutto comincia da qui.',
                  'How would you like to express and exhibit yourself, for a small or wider circle of others? Everything starts here.',
                )}
              </p>
              <label className="mp-wish">
                <span className="mp-visually-hidden">Performing Wish</span>
                <textarea value={wishText} rows={3} onChange={(e) => setWish(e.target.value)} />
              </label>
              <div className="mp-examples">
                {WISH_EXAMPLES.map((example) => (
                  <button key={example.en} type="button" onClick={() => setWish(pick(example, lang))}>
                    {pick(example, lang)}
                  </button>
                ))}
              </div>
              <dl className="mp-readout">
                <div><dt>{tt('Mezzo', 'Medium')}</dt><dd>{pick(MEDIA[wish.medium], lang)}</dd></div>
                <div><dt>{tt('Pubblico', 'Audience')}</dt><dd>{pick(AUDIENCES[wish.audience], lang)}</dd></div>
                <div><dt>{tt('Traccia', 'Trace')}</dt><dd>{pick(TRACE_KINDS[wish.trace], lang)}</dd></div>
                <div><dt>{tt('Lettura', 'Reading')}</dt><dd>{Math.round(wish.confidence * 100)}%</dd></div>
              </dl>
              <p className="mp-fine">
                {tt(
                  'Il System legge il desiderio senza inventare: ciò che non riconosce resta nell’immaginario. Ogni azione è reversibile.',
                  'The System reads the wish without inventing: what it does not recognise stays imaginal. Every action is reversible.',
                )}
              </p>
            </section>
          ) : null}

          {step === 'modulate' ? (
            <section className="mp-page">
              <h1>{tt('Tre tradizioni, tre assi', 'Three traditions, three axes')}</h1>
              <p className="mp-lede">
                {tt('Trascina il punto: quanto club, quanto rehab, quanto atelier.', 'Drag the point: how much club, how much rehab, how much atelier.')}
              </p>
              <TraditionTriangle lang={lang} />
              <label className="mp-axis">
                <span><b>{tt('Individuale', 'Individual')}</b><b>{tt('Di gruppo', 'Group')}</b></span>
                <input type="range" min={0} max={1} step={0.01} value={modulation.group} onChange={(e) => setModulation({ ...modulation, group: Number(e.target.value) })} />
                <small>{tt('tecnologie VR e AR', 'VR and AR technologies')}</small>
              </label>
              <label className="mp-axis">
                <span><b>{tt('Fisico', 'Physical')}</b><b>{tt('Virtuale', 'Virtual')}</b></span>
                <input type="range" min={0} max={1} step={0.01} value={modulation.virtual} onChange={(e) => setModulation({ ...modulation, virtual: Number(e.target.value) })} />
                <small>{tt('fattori economici e strategici', 'economic and strategic factors')}</small>
              </label>
              <div className="mp-interaction">
                <span>{tt('Interazione tra le tre componenti', 'Interaction between the three components')}</span>
                <strong>{Math.round(mod.interaction * 100)}%</strong>
                <small>{tt('architettura modulare virtuale/fisica', 'modular virtual/physical architecture')}</small>
              </div>
              <button type="button" className="mp-textbtn" onClick={proposeFromWish}>
                {tt('Torna alla proposta del System', 'Back to the System’s proposal')}
              </button>
            </section>
          ) : null}

          {step === 'plan' ? (
            <section className="mp-page">
              <h1>{tt('Il piano di Improvement', 'The Improvement plan')}</h1>
              <div className="mp-tiers">
                {PLAN_TIERS.map((item) => (
                  <button key={item.id} type="button" className={tier === item.id ? 'is-active' : ''} aria-pressed={tier === item.id} onClick={() => setTier(item.id)}>
                    <strong>{pick(item.label, lang)}</strong>
                    <small>{pick(item.summary, lang)}</small>
                  </button>
                ))}
              </div>
              <h2>{tt('Campi di assistenza', 'Fields of assistance')}</h2>
              <ul className="mp-fields">
                {FIELDS.map((field) => {
                  const off = disabledFields.includes(field.id)
                  const active = plan.activeFields.includes(field.id)
                  return (
                    <li key={field.id}>
                      <button type="button" className={off ? 'is-off' : active ? 'is-active' : ''} aria-pressed={!off} onClick={() => toggleField(field.id)}>
                        <i style={{ background: `hsl(${field.hue} 85% 55%)` }} />
                        <span>{pick(field.label, lang)}</span>
                        <b style={{ width: `${Math.min(100, Math.round(plan.fieldWeights[field.id] * 300))}%` }} />
                      </button>
                    </li>
                  )
                })}
              </ul>
              <div className={`mp-room${useHealingRoom ? ' is-on' : ''}`}>
                <div>
                  <strong>{tt('La tua Healing Room come stazione', 'Your Healing Room as a station')}</strong>
                  <small>
                    {pick(planById(room.plan).label, lang)} · {room.modules.length ? room.modules.map((id) => pick(SOUND_MODULES.find((m) => m.id === id)!.label, lang)).join(', ') : '—'} · {pick(lightById(room.light).label, lang)}
                    {room.objects.length ? ` · ${room.objects.slice(0, 3).map((id) => pick(ROOM_OBJECTS.find((o) => o.id === id)!.label, lang)).join(', ')}` : ''}
                  </small>
                </div>
                <div className="mp-room-actions">
                  <button type="button" aria-pressed={useHealingRoom} onClick={() => setUseHealingRoom(!useHealingRoom)}>
                    {useHealingRoom ? tt('Collegata', 'Linked') : tt('Collega', 'Link')}
                  </button>
                  <button type="button" onClick={() => setAppView('healing')}>{tt('Modifica', 'Edit')}</button>
                </div>
              </div>
            </section>
          ) : null}

          {step === 'traces' ? (
            <section className="mp-page">
              <h1>{tt('Lasciare tracce che restano', 'Leaving traces that stay')}</h1>
              <p className="mp-lede">
                {tt('Ogni sessione ti cambia. Completa una sessione per depositarne la traccia: il registro è solo in aggiunta.', 'Each session changes you. Complete a session to deposit its trace: the register is append-only.')}
              </p>
              <p className="mp-count">
                <strong>{planTraces.length}</strong>/{plan.sessions.length} {tt('tracce in questo piano', 'traces in this plan')}
              </p>
              <button type="button" className="mp-textbtn" onClick={exportPlan}>{tt('Scarica il piano', 'Download the plan')} ↓</button>
              <button type="button" className="mp-textbtn" onClick={() => setTraces([])}>{tt('Svuota il registro locale', 'Clear the local register')}</button>
              <button type="button" className="mp-textbtn" onClick={reset}>{tt('Ricomincia da un nuovo Wish', 'Start again from a new Wish')}</button>
            </section>
          ) : null}

          <div className="mp-nav">
            <button type="button" disabled={!prev} onClick={() => prev && setStep(prev.id)}>← {prev ? tt(prev.it, prev.en) : ''}</button>
            {next ? (
              <button type="button" className="is-primary" onClick={() => setStep(next.id)}>{tt(next.it, next.en)} →</button>
            ) : (
              <button type="button" className="is-primary" onClick={() => setAppView('site')}>SED →</button>
            )}
          </div>
        </aside>

        <main className="mp-stage">
          <ChromaField
            traditions={mod.traditions}
            group={mod.group}
            virtual={mod.virtual}
            interaction={mod.interaction}
            wishHue={wish.hue}
            traceHues={planTraces.map((t) => t.hue)}
          />
          <div className={`mp-headline mp-headline--${step}`}>
            <p>{step === 'wish' ? tt('Lascia che il luogo ti assista a diventare di più', 'Let the place assist you to become more') : 'Performing Wish'}</p>
            <h2>{wish.text || tt('Esprimi un desiderio…', 'Express a wish…')}</h2>
          </div>

          {step === 'modulate' ? (
            <ul className="mp-poles" aria-hidden="true">
              {TRADITIONS.map((t) => (
                <li key={t.id} className={`mp-pole mp-pole--${t.id}`}>
                  <strong>{pick(t.label, lang)}</strong>
                  <span>{pick(t.gesture, lang)}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {showAssistants ? (
            <ul className="mp-assistants" aria-label={tt('Assistenti emergenti', 'Emerging assistants')}>
              {plan.assistants.map((a, i) => {
                const angle = -Math.PI / 2 + (i / plan.assistants.length) * Math.PI * 2
                return (
                  <li
                    key={a.id}
                    className={a.shell === 'virtual' ? 'is-virtual' : ''}
                    style={{ left: `${50 + Math.cos(angle) * 35}%`, top: `${45 + Math.sin(angle) * 22}%`, ['--hue' as string]: a.hue }}
                    title={pick(ASSISTANTS[a.id].role, lang)}
                  >
                    <i aria-hidden="true" />
                    <span>
                      <strong>{pick(ASSISTANTS[a.id].label, lang)}</strong>
                      <small>
                        {a.shell === 'virtual' ? tt('virtuale', 'virtual') : tt('fisico', 'physical')} · {tt('dalla sessione', 'from session')} {a.emergesAt + 1}
                      </small>
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : null}

          {step === 'plan' || step === 'traces' ? (
            <ol className="mp-timeline" aria-label={tt('Sessioni', 'Sessions')}>
              {plan.sessions.map((session) => {
                const field = FIELDS.find((f) => f.id === session.field)!
                const done = planTraces.some((t) => t.session === session.index)
                return (
                  <li key={session.index} className={`${done ? 'is-done' : ''} is-${session.phase}`} style={{ ['--hue' as string]: field.hue }}>
                    <span className="mp-ses-n">{String(session.index + 1).padStart(2, '0')}</span>
                    <span className="mp-ses-phase">{pick(PHASES[session.phase], lang)}</span>
                    <strong>{pick(field.label, lang)}</strong>
                    <small>
                      {pick(VENUES[session.venue], lang)} · {session.minutes}′
                    </small>
                    <i className="mp-ses-bar" style={{ height: `${Math.round(18 + session.intensity * 40)}px` }} />
                    {step === 'traces' ? (
                      <button type="button" disabled={done} onClick={() => setTraces(depositTrace(traces, plan, session.index, Date.now()))}>
                        {done ? tt('traccia ✓', 'trace ✓') : tt('Completa', 'Complete')}
                      </button>
                    ) : null}
                  </li>
                )
              })}
            </ol>
          ) : null}
        </main>

        <aside className="mp-more">
          <p className="mp-eyebrow">{tt('Più', 'More')}</p>
          <MoreRadar values={plan.more} lang={lang} />
          <ul className="mp-more-list">
            {MORE.map((m) => (
              <li key={m.id}>
                <span>{pick(m.label, lang)}</span>
                <b>{Math.round(plan.more[m.id] * 100)}</b>
              </li>
            ))}
          </ul>
          <div className="mp-totals">
            <div><b>{plan.sessions.length}</b><small>{tt('sessioni', 'sessions')}</small></div>
            <div><b>{Math.round(plan.totalMinutes / 60)}h</b><small>{tt('di processo', 'of process')}</small></div>
            <div><b>{plan.assistants.length}</b><small>{tt('assistenti', 'assistants')}</small></div>
          </div>
          <p className="mp-credit">
            Metaplace — {tt('concept e design DNA', 'concept and design DNA')}<br />
            <strong>Lorenzo Brusci</strong>
          </p>
          <p className="mp-fine mp-fine--dark">
            {tt(
              'Un luogo ibrido 24/7: club immersivo, rehab fisica e spirituale, atelier, teatro intimo. Il System propone, la persona decide; nessuna biometria reale viene raccolta.',
              'A hybrid 24/7 place: immersive club, physical and spiritual rehab, atelier, intimate theatre. The System proposes, the person decides; no real biometrics are collected.',
            )}
          </p>
        </aside>
      </div>
    </div>
  )
}
