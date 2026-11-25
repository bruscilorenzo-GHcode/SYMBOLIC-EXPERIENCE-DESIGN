import { useEffect, useMemo, useRef, useState } from 'react'
import type { CommunicationChannel, HealingZoneId } from '@aura-spec/healing-room'
import {
  HEALING_STATIONS,
  HEALING_ZONES,
  MIND_STATES,
  canEnterFocusZone,
  communicationChannelLabel,
  healingLayoutById,
  healingZoneById,
  mindStateDefinition,
  mindStateFromFocus,
} from '@aura-spec/healing-room'
import { HealingScene } from './HealingScene'
import { HealingAudition } from './healingAudition'
import { soundbedForState } from './healingAudition'
import { useStudioStore } from '../state/store'
import './healing.css'

const CHANNEL_ORDER: CommunicationChannel[] = ['self', 'twin', 'others', 'artefacts']

export function HealingRoomView() {
  const lang = useStudioStore((state) => state.lang)
  const setLang = useStudioStore((state) => state.setLang)
  const setAppView = useStudioStore((state) => state.setAppView)
  const healing = useStudioStore((state) => state.healing)
  const enterZone = useStudioStore((state) => state.enterHealingZone)
  const setLayout = useStudioStore((state) => state.setHealingLayout)
  const setStation = useStudioStore((state) => state.setHealingStation)
  const pushSample = useStudioStore((state) => state.pushHealingSample)
  const setFocus = useStudioStore((state) => state.setHealingFocus)
  const resetHealing = useStudioStore((state) => state.resetHealing)

  const [audioOn, setAudioOn] = useState(false)
  const [draft, setDraft] = useState<Record<CommunicationChannel, number>>({
    self: 0.5,
    twin: 0.5,
    others: 0.5,
    artefacts: 0.5,
  })
  const audioRef = useRef<HealingAudition | null>(null)

  const t = (it: string, en: string): string => (lang === 'it' ? it : en)

  const mindState = mindStateFromFocus(healing.focus)
  const mind = mindStateDefinition(mindState)
  const gate = canEnterFocusZone(healing)
  const layout = healingLayoutById(healing.layout)
  const zone = healingZoneById(healing.zone)
  const soundbed = useMemo(() => soundbedForState(mindState), [mindState])

  useEffect(() => {
    return () => {
      audioRef.current?.stop()
      setAudioOn(false)
    }
  }, [])

  useEffect(() => {
    audioRef.current?.update(soundbed, healing.doppelganger)
  }, [soundbed, healing.doppelganger])

  const toggleAudio = async (): Promise<void> => {
    if (audioOn) {
      audioRef.current?.stop()
      setAudioOn(false)
      return
    }
    try {
      const engine = audioRef.current ?? new HealingAudition()
      audioRef.current = engine
      await engine.start(soundbed, healing.doppelganger)
      setAudioOn(true)
    } catch {
      setAudioOn(false)
    }
  }

  return (
    <div className="healing-shell" lang={lang}>
      <header className="healing-header">
        <button type="button" className="healing-back" onClick={() => setAppView('site')}>
          ← MAS
        </button>
        <div className="healing-title">
          <strong>HEALING ROOM</strong>
          <small>{t('Stanza diagnostica e terapeutica · AURA-SPEC', 'Diagnostic and health treatment room · AURA-SPEC')}</small>
        </div>
        <div className="healing-header-actions">
          <button
            type="button"
            className={`healing-chip${sessionHealedCheck(healing.focus, healing.goal?.materialisation ?? 0) ? ' is-healed' : ''}`}
          >
            {t('Mente', 'Mind')}: {t(mind.labelIt, mind.label)}
          </button>
          <button type="button" className={`healing-chip${audioOn ? ' is-active' : ''}`} onClick={() => void toggleAudio()}>
            {audioOn ? t('Silenzia la doccia sonora', 'Silence the sound shower') : t('Doccia sonora', 'Sound shower')}
          </button>
          <div className="healing-lang" role="group" aria-label="Language">
            <button type="button" aria-pressed={lang === 'it'} className={lang === 'it' ? 'is-active' : ''} onClick={() => setLang('it')}>IT</button>
            <button type="button" aria-pressed={lang === 'en'} className={lang === 'en' ? 'is-active' : ''} onClick={() => setLang('en')}>EN</button>
          </div>
        </div>
      </header>

      <div className="healing-body">
        <aside className="healing-rail">
          <section className="healing-panel">
            <h2>{t('Percorso', 'Journey')}</h2>
            <div className="healing-zones">
              {HEALING_ZONES.map((item, index) => {
                const disabled = item.id === 'focus' && !gate.ok
                const active = healing.zone === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`healing-zone${active ? ' is-active' : ''}`}
                    disabled={disabled}
                    onClick={() => enterZone(item.id as HealingZoneId)}
                  >
                    <span className="healing-zone-number">0{index + 1}</span>
                    <span>
                      <strong>{t(item.nameIt, item.name)}</strong>
                      <small>{t(item.purposeIt, item.purpose)}</small>
                      {item.id === 'focus' && !gate.ok ? (
                        <em>
                          {gate.reason === 'data'
                            ? t(`Servono ${gate.requiredSamples} campioni diagnostici`, `${gate.requiredSamples} diagnostic samples required`)
                            : t(`Serve concentrazione ≥ ${Math.round(gate.requiredFocus * 100)}%`, `Concentration ≥ ${Math.round(gate.requiredFocus * 100)}% required`)}
                        </em>
                      ) : null}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="healing-panel">
            <h2>{t('Diagnostica — comunica', 'Diagnostics — communicate')}</h2>
            <p className="healing-hint">
              {t(
                'Dichiara gli stati interiori che i dispositivi non misurano: ogni canale alimenta il Doppelgänger.',
                'Declare the inner states devices cannot measure: every channel feeds the Doppelgänger.',
              )}
            </p>
            {CHANNEL_ORDER.map((channel) => (
              <div key={channel} className="healing-channel">
                <label htmlFor={`healing-${channel}`}>{communicationChannelLabel(channel, lang)}</label>
                <div className="healing-channel-row">
                  <input
                    id={`healing-${channel}`}
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={draft[channel]}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, [channel]: Number(event.target.value) }))
                    }
                  />
                  <button type="button" onClick={() => pushSample(channel, draft[channel])}>
                    {t('Registra', 'Record')}
                  </button>
                </div>
              </div>
            ))}
            <p className="healing-count">
              {healing.samples.length} {t('campioni raccolti', 'samples collected')}
            </p>
          </section>

          <section className="healing-panel">
            <h2>{t('Concentrazione', 'Concentration')}</h2>
            <input
              className="healing-focus"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={healing.focus}
              onChange={(event) => setFocus(Number(event.target.value))}
              aria-label={t('Profondità di concentrazione', 'Concentration depth')}
            />
            <div className="healing-mind-ladder">
              {MIND_STATES.map((state) => (
                <span key={state.id} className={state.id === mindState ? 'is-active' : ''}>
                  {t(state.labelIt, state.label)}
                </span>
              ))}
            </div>
            <p className="healing-hint">{t(mind.guidanceIt, mind.guidance)}</p>
          </section>

          <section className="healing-panel">
            <h2>{t('Stazione', 'Station')}</h2>
            <div className="healing-stations">
              {HEALING_STATIONS.map((station) => (
                <button
                  key={station.kind}
                  type="button"
                  className={`healing-station${healing.station === station.kind ? ' is-active' : ''}`}
                  onClick={() => setStation(station.kind)}
                >
                  <strong>{t(station.labelIt, station.label)}</strong>
                  <small>{t(station.descriptionIt, station.description)}</small>
                </button>
              ))}
            </div>
            <h2>{t('Relazione degli spazi', 'Spaces relation')}</h2>
            <div className="healing-layouts">
              {(['linear', 'concentrated'] as const).map((id) => {
                const item = healingLayoutById(id)
                return (
                  <button
                    key={id}
                    type="button"
                    className={`healing-station${healing.layout === id ? ' is-active' : ''}`}
                    onClick={() => setLayout(id)}
                  >
                    <strong>{t(item.labelIt, item.label)}</strong>
                    <small>{t(item.descriptionIt, item.description)}</small>
                  </button>
                )
              })}
            </div>
          </section>

          <button type="button" className="healing-reset" onClick={resetHealing}>
            {t('Azzera la sessione', 'Reset session')}
          </button>
        </aside>

        <main className="healing-stage">
          <HealingScene
            layout={healing.layout}
            zone={healing.zone}
            station={healing.station}
            samples={healing.samples}
            doppelganger={healing.doppelganger}
            goal={healing.goal}
          />
          <div className="healing-stage-top">
            <span>{healing.zone === 'focus' ? t('AREA FOCUS — TERAPIA', 'FOCUS AREA — THERAPY') : t(zone.nameIt.toUpperCase(), zone.name.toUpperCase())}</span>
            <span>{t(layout.labelIt, layout.label)}</span>
          </div>
          {healing.doppelganger ? (
            <div className="healing-stage-side">
              <strong>{t('Doppelgänger', 'Doppelgänger')}</strong>
              <span>{t(healing.doppelganger.descriptorLabelIt, healing.doppelganger.descriptorLabel)}</span>
              <span>
                {t('Respiro', 'Breath')}: {(healing.doppelganger.breathHz * 60).toFixed(1)} {t('atti/min', 'acts/min')}
              </span>
              <span>
                {t('Complessità', 'Complexity')}: {Math.round(healing.doppelganger.complexity * 100)}%
              </span>
            </div>
          ) : null}
          {healing.goal ? (
            <div className="healing-goal">
              <strong>{t(healing.goal.titleIt, healing.goal.title)}</strong>
              <span>{t(healing.goal.mantraIt, healing.goal.mantra)}</span>
              <div className="healing-goal-bar">
                <i style={{ width: `${Math.round(healing.goal.materialisation * 100)}%` }} />
              </div>
              <small>{t('Materializzazione dell’obiettivo', 'Goal materialisation')}</small>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  )
}

function sessionHealedCheck(focus: number, materialisation: number): boolean {
  return mindStateFromFocus(focus) === 'empty' && materialisation >= 1
}
