import { useEffect, useMemo, useRef, useState } from 'react'
import type { CommunicationChannel } from '@aura-spec/healing-room'
import {
  MIND_STATES,
  canEnterFocusZone,
  communicationChannelLabel,
  mindStateDefinition,
  mindStateFromFocus,
} from '@aura-spec/healing-room'
import { useStudioStore } from '../state/store'
import { SystemBar } from '../system/SystemBar'
import { RoomPlan, type JourneyStage } from './RoomPlan'
import { RoomAudition } from './roomAudition'
import {
  ATMOSPHERES,
  LIGHT_SCENES,
  ROOM_OBJECTS,
  ROOM_PLANS,
  ROOM_STEPS,
  SOUND_MODULES,
  ZONE_COLORS,
  lightById,
  planById,
  roomBrief,
  roomChannels,
  useRoomDesign,
  type Bi,
  type RoomPlanId,
} from './roomDesign'
import './healing.css'

const CHANNELS: CommunicationChannel[] = ['self', 'twin', 'others', 'artefacts']

const JOURNEY: Array<{ id: JourneyStage; label: Bi; text: Bi }> = [
  {
    id: 'lobby',
    label: { it: 'Invito', en: 'Invitation' },
    text: {
      it: 'L’esperienza comincia con un invito. Il vestibolo lavora come un giardino vivo e digitale: qui si attende la propria sessione.',
      en: 'The experience starts with an invitation. The vestibule works as a living, digital garden: here guests await their session.',
    },
  },
  {
    id: 'gallery',
    label: { it: 'Galleria', en: 'Gallery' },
    text: {
      it: 'Si cammina lungo l’anello di osservazione. Quando l’agente osserva la stanza, la stanza osserva l’agente raccogliendo dati.',
      en: 'You walk the observation ring. When the agent observes the room, the room observes the agent by collecting data.',
    },
  },
  {
    id: 'rite',
    label: { it: 'Rito di passaggio', en: 'Rite of passage' },
    text: {
      it: 'Ogni stanza diagnostica serve l’intero processo: spogliatoio, diagnostica, trattamento, rilassamento. Dichiara ciò che i dispositivi non misurano.',
      en: 'Each diagnostic room serves the whole process: changing room, diagnostics, treatment, relaxation. Declare what devices cannot measure.',
    },
  },
  {
    id: 'centre',
    label: { it: 'Centro', en: 'Centre' },
    text: {
      it: 'La valutazione avviene al centro: i dati raccolti diventano il tuo Doppelgänger digitale, che fa da guida nel processo di cura.',
      en: 'Evaluation happens at the centre: the gathered data become your Digital Doppelgänger, a guide through the healing process.',
    },
  },
  {
    id: 'world',
    label: { it: 'Ritorno al mondo', en: 'Back to the world' },
    text: {
      it: 'Il Doppelgänger spiega il tuo stato olistico; in dono ricevi un talismano phygital che ti tiene consapevole tornando nel mondo.',
      en: 'The Doppelgänger explains your holistic state; as a gift you receive a phygital talisman that keeps you conscious going back to the world.',
    },
  },
]

const RITE_STEPS: Bi[] = [
  { it: 'Spogliatoio', en: 'Changing room' },
  { it: 'Diagnostica', en: 'Diagnostics' },
  { it: 'Trattamento', en: 'Treatment' },
  { it: 'Rilassamento', en: 'Relaxation' },
]

function PlanGlyph({ id }: { id: RoomPlanId }) {
  if (id === 'rite') {
    return (
      <svg viewBox="-16 -16 32 32" aria-hidden="true">
        <rect x={-13.5} y={-13.5} width={27} height={27} fill={ZONE_COLORS.diagnostic} stroke="#111" strokeWidth={0.9} />
        <circle r={9.25} fill={ZONE_COLORS.observation} stroke="#111" strokeWidth={0.8} />
        <circle r={4} fill={ZONE_COLORS.healing} stroke="#111" strokeWidth={0.6} />
        <rect x={-6} y={9.6} width={12} height={3.9} fill={ZONE_COLORS.vestibule} stroke="#111" strokeWidth={0.6} />
        <path d="M -3.3 -13.5 V -9.4 M 3.3 -13.5 V -9.4 M -13.5 -3.4 H -9.4 M -13.5 3.4 H -9.4 M 13.5 -3.4 H 9.4 M 13.5 3.4 H 9.4" stroke="#111" strokeWidth={0.6} />
      </svg>
    )
  }
  const r = 7.62 / Math.cos(Math.PI / 8)
  const oct = Array.from({ length: 8 }, (_, i) => {
    const a = Math.PI / 8 + (i * Math.PI) / 4
    return `${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`
  }).join(' ')
  return (
    <svg viewBox="-14 -14 28 28" aria-hidden="true">
      {[45, 135, 225, 315].map((a) => {
        const x = 10.4 * Math.cos((a * Math.PI) / 180)
        const y = 10.4 * Math.sin((a * Math.PI) / 180)
        return <rect key={a} x={x - 2.1} y={y - 2.1} width={4.2} height={4.2} transform={`rotate(45 ${x} ${y})`} fill={ZONE_COLORS.eventDiagnostic} stroke="#111" strokeWidth={0.6} />
      })}
      <polygon points={oct} fill={ZONE_COLORS.eventObservation} stroke="#111" strokeWidth={0.8} />
      <circle r={3.6} fill={ZONE_COLORS.eventFocus} stroke="#111" strokeWidth={0.5} />
    </svg>
  )
}

export function HealingRoomView() {
  const lang = useStudioStore((s) => s.lang)
  const setAppView = useStudioStore((s) => s.setAppView)
  const healing = useStudioStore((s) => s.healing)
  const enterZone = useStudioStore((s) => s.enterHealingZone)
  const pushSample = useStudioStore((s) => s.pushHealingSample)
  const setFocus = useStudioStore((s) => s.setHealingFocus)
  const resetHealing = useStudioStore((s) => s.resetHealing)

  const design = useRoomDesign((s) => s.design)
  const step = useRoomDesign((s) => s.step)
  const view = useRoomDesign((s) => s.view)
  const setStep = useRoomDesign((s) => s.setStep)
  const setView = useRoomDesign((s) => s.setView)
  const setPlan = useRoomDesign((s) => s.setPlan)
  const toggleModule = useRoomDesign((s) => s.toggleModule)
  const toggleObject = useRoomDesign((s) => s.toggleObject)
  const setLight = useRoomDesign((s) => s.setLight)
  const setLightLevel = useRoomDesign((s) => s.setLightLevel)
  const setAtmosphere = useRoomDesign((s) => s.setAtmosphere)

  const [journey, setJourney] = useState<JourneyStage>('lobby')
  const [riteStep, setRiteStep] = useState(0)
  const [guided, setGuided] = useState(true)
  const [draft, setDraft] = useState<Record<CommunicationChannel, number>>({ self: 0.5, twin: 0.5, others: 0.5, artefacts: 0.5 })
  const [playing, setPlaying] = useState(false)
  const audio = useRef<RoomAudition | null>(null)

  const t = (b: Bi): string => (lang === 'it' ? b.it : b.en)
  const tt = (it: string, en: string): string => (lang === 'it' ? it : en)
  const plan = planById(design.plan)
  const gate = canEnterFocusZone(healing)
  const mindId = mindStateFromFocus(healing.focus)
  const mind = mindStateDefinition(mindId)
  const channels = roomChannels(design)
  const stepSpec = ROOM_STEPS.find((s) => s.step === step)!

  const sound = useMemo(
    () => ({
      atmosphere: design.atmosphere,
      modules: design.modules,
      brightness: design.lightLevel,
      twinHz: healing.doppelganger ? 96 + healing.doppelganger.hue / 3 : null,
      breathSeconds: healing.doppelganger ? 1 / healing.doppelganger.breathHz : 6,
    }),
    [design.atmosphere, design.modules, design.lightLevel, healing.doppelganger],
  )

  useEffect(() => {
    audio.current?.update(sound)
  }, [sound])

  useEffect(() => () => audio.current?.stop(), [])

  const toggleAudio = async (): Promise<void> => {
    if (playing) {
      audio.current?.stop()
      setPlaying(false)
      return
    }
    try {
      audio.current = audio.current ?? new RoomAudition()
      await audio.current.start(sound)
      setPlaying(true)
    } catch {
      setPlaying(false)
    }
  }

  const goJourney = (stage: JourneyStage): void => {
    if (stage === 'centre' || stage === 'world') {
      if (!gate.ok && healing.zone !== 'focus') return
      enterZone('focus')
    } else if (stage === 'lobby') {
      enterZone('vestibule')
    } else {
      enterZone('observation')
    }
    setJourney(stage)
  }

  const journeyIndex = JOURNEY.findIndex((j) => j.id === journey)
  const centreLocked = !gate.ok && healing.zone !== 'focus'

  const downloadBrief = (): void => {
    const blob = new Blob([roomBrief(design, lang)], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = lang === 'it' ? 'healing-room-scheda.txt' : 'healing-room-sheet.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="hr-shell" lang={lang}>
      <SystemBar
        place="healing"
        actions={
          <button type="button" className={`hr-listen${playing ? ' is-on' : ''}`} onClick={() => void toggleAudio()} aria-pressed={playing}>
            <i aria-hidden="true" />
            {playing ? tt('In ascolto', 'Listening') : tt('Ascolta la stanza', 'Listen to the room')}
          </button>
        }
      />

      <div className="hr-body">
        <aside className="hr-rail" aria-label={tt('Configurazione', 'Configuration')}>
          <div className="hr-step-head">
            <span className="hr-step-num">0{step}</span>
            <div>
              <h1>{t(stepSpec.label)}</h1>
              <p>{t(stepSpec.hint)}</p>
            </div>
          </div>

          {step === 1 ? (
            <section className="hr-section">
              <div className="hr-plans">
                {ROOM_PLANS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`hr-plan-card${design.plan === item.id ? ' is-active' : ''}`}
                    aria-pressed={design.plan === item.id}
                    onClick={() => setPlan(item.id)}
                  >
                    <PlanGlyph id={item.id} />
                    <span>
                      <strong>{t(item.label)}</strong>
                      <small>{t(item.author)}</small>
                    </span>
                  </button>
                ))}
              </div>
              <p className="hr-copy">{t(plan.summary)}</p>
              <table className="hr-zones">
                <tbody>
                  {plan.zones.map((zone) => (
                    <tr key={zone.id}>
                      <td><i style={{ background: zone.color }} /></td>
                      <td>{t(zone.label)}</td>
                      <td>{zone.areaSqm > 0 ? `${zone.areaSqm.toLocaleString(lang === 'it' ? 'it-IT' : 'en-GB', { maximumFractionDigits: 2 })} m²` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="hr-note">
                {tt(
                  'Il processo meditativo guida la definizione degli spazi: mente quotidiana, mente che osserva, concentrazione, mente vuota.',
                  'The meditation process guides the definition of the spaces: everyday mind, observing mind, concentration, empty mind.',
                )}
              </p>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="hr-section">
              <div className="hr-toggles">
                {SOUND_MODULES.map((module) => {
                  const on = design.modules.includes(module.id)
                  return (
                    <button key={module.id} type="button" className={`hr-toggle${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => toggleModule(module.id)}>
                      <span className="hr-toggle-top">
                        <strong>{t(module.label)}</strong>
                        <em>{module.channels} ch</em>
                      </span>
                      <small>{t(module.summary)}</small>
                      <span className="hr-toggle-where">{t(module.where)}</span>
                    </button>
                  )
                })}
              </div>
              <p className="hr-total">
                <strong>{channels}</strong> {tt('canali in totale', 'channels in total')}
              </p>
            </section>
          ) : null}

          {step === 3 ? (
            <section className="hr-section">
              <h2>{tt('Oggetti', 'Objects')}</h2>
              <div className="hr-chips hr-chips--grid">
                {ROOM_OBJECTS.map((object) => {
                  const on = design.objects.includes(object.id)
                  return (
                    <button key={object.id} type="button" className={`hr-chip${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => toggleObject(object.id)} title={t(object.summary)}>
                      {t(object.label)}
                    </button>
                  )
                })}
              </div>
              <h2>{tt('Luce', 'Light')}</h2>
              <div className="hr-lights">
                {LIGHT_SCENES.map((light) => (
                  <button
                    key={light.id}
                    type="button"
                    className={`hr-light${design.light === light.id ? ' is-on' : ''}`}
                    aria-pressed={design.light === light.id}
                    onClick={() => setLight(light.id)}
                  >
                    <i style={{ background: `radial-gradient(circle at 35% 35%, ${light.color}, ${light.glow})` }} aria-hidden="true" />
                    {t(light.label)}
                  </button>
                ))}
              </div>
              <label className="hr-slider">
                <span>{tt('Intensità', 'Intensity')} <b>{Math.round(design.lightLevel * 100)}%</b></span>
                <input type="range" min={0} max={1} step={0.01} value={design.lightLevel} onChange={(e) => setLightLevel(Number(e.target.value))} />
              </label>
              <p className="hr-note">{t(lightById(design.light).summary)}</p>
              <h2>{tt('Atmosfera sonora', 'Sound atmosphere')}</h2>
              <div className="hr-chips">
                {ATMOSPHERES.map((atm) => (
                  <button key={atm.id} type="button" className={`hr-chip${design.atmosphere === atm.id ? ' is-on' : ''}`} aria-pressed={design.atmosphere === atm.id} onClick={() => setAtmosphere(atm.id)} title={t(atm.summary)}>
                    {t(atm.label)}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {step === 4 ? (
            <section className="hr-section">
              <ol className="hr-journey">
                {JOURNEY.map((item, index) => {
                  const locked = (item.id === 'centre' || item.id === 'world') && centreLocked
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={journey === item.id ? 'is-active' : index < journeyIndex ? 'is-done' : ''}
                        disabled={locked}
                        onClick={() => goJourney(item.id)}
                      >
                        <span>{index + 1}</span>
                        {t(item.label)}
                      </button>
                    </li>
                  )
                })}
              </ol>
              <p className="hr-copy">{t(JOURNEY[journeyIndex]!.text)}</p>

              {journey === 'rite' ? (
                <>
                  <div className="hr-seg" role="group" aria-label={tt('Modalità', 'Mode')}>
                    <button type="button" aria-pressed={guided} onClick={() => setGuided(true)}>{tt('Guidata', 'Guided')}</button>
                    <button type="button" aria-pressed={!guided} onClick={() => setGuided(false)}>{tt('Autoguidata', 'Self-guided')}</button>
                  </div>
                  <p className="hr-note">
                    {guided
                      ? tt('Specialisti: medici, personal trainer, fisioterapisti, coach, psicologi.', 'Specialists: doctors, personal trainers, physiotherapists, coaches, psychologists.')
                      : tt('Host-avatar: AI e Doppelgänger basato sui dati.', 'Host avatar: AI and data-based Doppelgänger.')}
                  </p>
                  <ol className="hr-rite">
                    {RITE_STEPS.map((item, index) => (
                      <li key={item.en}>
                        <button type="button" className={riteStep === index ? 'is-active' : index < riteStep ? 'is-done' : ''} onClick={() => setRiteStep(index)}>
                          {t(item)}
                        </button>
                      </li>
                    ))}
                  </ol>
                  {CHANNELS.map((channel) => (
                    <div key={channel} className="hr-channel">
                      <label htmlFor={`hr-${channel}`}>{communicationChannelLabel(channel, lang)}</label>
                      <div>
                        <input id={`hr-${channel}`} type="range" min={0} max={1} step={0.01} value={draft[channel]} onChange={(e) => setDraft((d) => ({ ...d, [channel]: Number(e.target.value) }))} />
                        <button
                          type="button"
                          onClick={() => {
                            pushSample(channel, draft[channel])
                            setRiteStep((value) => Math.min(3, value + 1))
                          }}
                        >
                          {tt('Registra', 'Record')}
                        </button>
                      </div>
                    </div>
                  ))}
                  <p className="hr-total">
                    <strong>{Math.min(healing.samples.length, gate.requiredSamples)}/{gate.requiredSamples}</strong> {tt('campioni per entrare al centro', 'samples to enter the centre')}
                  </p>
                </>
              ) : null}

              {journey === 'centre' || journey === 'world' || (journey === 'rite' && healing.samples.length >= gate.requiredSamples) ? (
                <div className="hr-focus">
                  <label className="hr-slider">
                    <span>{tt('Concentrazione', 'Concentration')} <b>{t({ it: mind.labelIt, en: mind.label })}</b></span>
                    <input type="range" min={0} max={1} step={0.01} value={healing.focus} onChange={(e) => setFocus(Number(e.target.value))} />
                  </label>
                  <div className="hr-ladder">
                    {MIND_STATES.map((state) => (
                      <span key={state.id} className={state.id === mindId ? 'is-on' : ''}>{t({ it: state.labelIt, en: state.label })}</span>
                    ))}
                  </div>
                  {healing.doppelganger ? (
                    <p className="hr-note">
                      {t({ it: healing.doppelganger.descriptorLabelIt, en: healing.doppelganger.descriptorLabel })} · {tt('respiro', 'breath')} {(healing.doppelganger.breathHz * 60).toFixed(1)}/min
                    </p>
                  ) : null}
                  {healing.goal ? (
                    <div className="hr-goal">
                      <strong>{t({ it: healing.goal.titleIt, en: healing.goal.title })}</strong>
                      <span>{t({ it: healing.goal.mantraIt, en: healing.goal.mantra })}</span>
                      <i style={{ width: `${Math.round(healing.goal.materialisation * 100)}%` }} />
                    </div>
                  ) : null}
                </div>
              ) : null}

              {centreLocked && journey !== 'rite' ? (
                <p className="hr-note hr-note--warn">
                  {tt('Il centro si apre dopo il rito di passaggio: servono 4 campioni e una concentrazione profonda.', 'The centre opens after the rite of passage: 4 samples and deep concentration are needed.')}
                </p>
              ) : null}
              <button type="button" className="hr-link" onClick={() => { resetHealing(); setJourney('lobby'); setRiteStep(0) }}>
                {tt('Ricomincia la sessione', 'Restart the session')}
              </button>
            </section>
          ) : null}

          <div className="hr-nav">
            <button type="button" disabled={step === 1} onClick={() => setStep((step - 1) as 1 | 2 | 3)}>
              ← {tt('Indietro', 'Back')}
            </button>
            {step < 4 ? (
              <button type="button" className="is-primary" onClick={() => setStep((step + 1) as 2 | 3 | 4)}>
                {t(ROOM_STEPS[step]!.label)} →
              </button>
            ) : (
              <button type="button" className="is-primary is-meta" onClick={() => setAppView('metaplace')}>
                {tt('Metaplace', 'Metaplace')} →
              </button>
            )}
          </div>
        </aside>

        <main className="hr-stage">
          <div className="hr-stage-bar">
            <div className="hr-seg" role="group" aria-label={tt('Vista', 'View')}>
              <button type="button" aria-pressed={view === 'plan'} onClick={() => setView('plan')}>{tt('Pianta', 'Plan')}</button>
              <button type="button" aria-pressed={view === 'axo'} onClick={() => setView('axo')}>{tt('Assonometria', 'Axonometry')}</button>
            </div>
            <span className="hr-stage-title">
              {t(plan.label)} · {t(plan.author)}
            </span>
          </div>
          <RoomPlan
            design={design}
            view={view}
            step={step}
            lang={lang}
            playing={playing}
            journey={journey}
            doppelganger={healing.doppelganger}
            goal={healing.goal}
            samples={healing.samples.length}
          />
          {view === 'plan' ? (
            <ul className="hr-legend">
              {plan.zones.map((zone) => (
                <li key={zone.id}><i style={{ background: zone.color }} />{t(zone.label)}</li>
              ))}
              {design.modules.length ? <li><i className="is-sound" />{tt('Moduli sonori', 'Sound modules')}</li> : null}
            </ul>
          ) : (
            <p className="hr-stage-caption">
              {tt('Il suono è un piano: i moduli galleggiano sopra l’architettura.', 'Sound is a layer: the modules float above the architecture.')}
            </p>
          )}
        </main>

        <aside className="hr-sheet" aria-label={tt('Scheda di progetto', 'Design sheet')}>
          <p className="hr-eyebrow">{tt('Scheda di progetto', 'Design sheet')}</p>
          <dl>
            <div><dt>01 {tt('Spazio', 'Space')}</dt><dd>{t(plan.label)}<small>{plan.areaSqm.toLocaleString(lang === 'it' ? 'it-IT' : 'en-GB')} m²</small></dd></div>
            <div><dt>02 {tt('Suono', 'Sound')}</dt><dd>{design.modules.length ? design.modules.map((id) => t(SOUND_MODULES.find((m) => m.id === id)!.label)).join(', ') : '—'}<small>{channels} {tt('canali', 'channels')}</small></dd></div>
            <div><dt>03 {tt('Oggetti', 'Objects')}</dt><dd>{design.objects.length ? design.objects.map((id) => t(ROOM_OBJECTS.find((o) => o.id === id)!.label)).join(', ') : '—'}</dd></div>
            <div><dt>{tt('Luce', 'Light')}</dt><dd>{t(lightById(design.light).label)}<small>{Math.round(design.lightLevel * 100)}%</small></dd></div>
            <div><dt>{tt('Atmosfera', 'Atmosphere')}</dt><dd>{t(ATMOSPHERES.find((a) => a.id === design.atmosphere)!.label)}</dd></div>
          </dl>
          <button type="button" className="hr-sheet-btn" onClick={downloadBrief}>{tt('Scarica la scheda', 'Download the sheet')} ↓</button>
          <button type="button" className="hr-sheet-btn is-meta" onClick={() => setAppView('metaplace')}>
            {tt('Usala nel Metaplace', 'Use it in the Metaplace')} →
          </button>
          <p className="hr-fine">
            {tt('Concept di studio: metrature e canali sono indicativi, nessun dato sanitario reale viene raccolto.', 'Study concept: areas and channels are indicative; no real health data is collected.')}
          </p>
        </aside>
      </div>
      <footer className="sys-credit">
        Healing Room — design <strong>Lorenzo Brusci</strong> · <strong>Greg Wilk</strong>, {tt('architetto', 'architect')}
      </footer>
    </div>
  )
}
