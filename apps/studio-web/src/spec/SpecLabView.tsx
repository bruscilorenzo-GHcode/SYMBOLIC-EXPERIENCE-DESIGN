import { useState, type KeyboardEvent } from 'react'
import { LayerPanel } from '../ui/LayerPanel'
import { StudioCanvas } from '../scene/StudioCanvas'
import { Inspector } from '../ui/Inspector'
import { SpecGeometry } from './SpecGeometry'
import { MaterialTablePanel } from './MaterialTablePanel'
import { BomPanel } from './BomPanel'
import { LandscapePanel } from '../ui/LandscapePanel'
import { OSC_RELAY_URL, studioOsc } from '../audio/oscClient'
import { useStudioStore } from '../state/store'
import './spec.css'
import type { SpecLabSection } from '@aura-spec/inhabiting-model'

const FREQUENCIES = [63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]

export function SpecLabView() {
  const lang = useStudioStore((state) => state.lang)
  const setLang = useStudioStore((state) => state.setLang)
  const section = useStudioStore((state) => state.specSection)
  const setSection = useStudioStore((state) => state.setSpecSection)
  const setAppView = useStudioStore((state) => state.setAppView)
  const environment = useStudioStore((state) => state.environment)
  const session = useStudioStore((state) => state.session)
  const profiles = useStudioStore((state) => state.profiles)
  const play = useStudioStore((state) => state.play)
  const designItems = useStudioStore((state) => state.designItems)
  const applyPlayComposition = useStudioStore((state) => state.applyPlayComposition)
  const openSpecLab = useStudioStore((state) => state.openSpecLab)
  const frequencyHz = useStudioStore((state) => state.frequencyHz)
  const setFrequency = useStudioStore((state) => state.setFrequency)
  const showPolar = useStudioStore((state) => state.showPolar)
  const showHeatmap = useStudioStore((state) => state.showHeatmap)
  const togglePolar = useStudioStore((state) => state.togglePolar)
  const toggleHeatmap = useStudioStore((state) => state.toggleHeatmap)
  const oscStatus = useStudioStore((state) => state.oscStatus)
  const setOscStatus = useStudioStore((state) => state.setOscStatus)

  const [busy, setBusy] = useState(false)
  const t = (it: string, en: string): string => (lang === 'it' ? it : en)

  const tabs: Array<{ id: SpecLabSection; label: string }> = [
    { id: 'blueprint', label: t('Blueprint acustico', 'Acoustic blueprint') },
    { id: 'geometry', label: t('Geometria e import', 'Geometry & import') },
    { id: 'materials', label: t('Materiali', 'Materials') },
    { id: 'bom', label: t('BOM e routing', 'BOM & routing') },
  ]

  const toggleOsc = async (): Promise<void> => {
    if (busy) return
    setBusy(true)
    try {
      if (oscStatus === 'connected') {
        await studioOsc.disconnect()
        setOscStatus('idle')
      } else {
        setOscStatus('connecting')
        await studioOsc.connect(OSC_RELAY_URL)
        setOscStatus('connected')
      }
    } catch {
      setOscStatus('error')
    } finally {
      setBusy(false)
    }
  }

  const sync = (): void => {
    applyPlayComposition()
    openSpecLab('blueprint')
  }

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    let next = index
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = tabs.length - 1
    else return
    event.preventDefault()
    setSection(tabs[next]!.id)
    document.getElementById(`spec-tab-${tabs[next]!.id}`)?.focus()
  }

  const oscMessage =
    oscStatus === 'connected'
      ? t('Relay OSC locale connesso. I messaggi vengono inoltrati via UDP a Max, SuperCollider o al plugin.', 'Local OSC relay connected. Messages are forwarded over UDP to Max, SuperCollider or the plugin.')
      : oscStatus === 'connecting'
        ? t('Connessione al relay locale…', 'Connecting to the local relay…')
        : oscStatus === 'error'
          ? t('Relay OSC offline. Non è un errore del progetto: il relay è un servizio locale che inoltra WebSocket → UDP. Avvia `pnpm dev:relay` sul computer e riprova.', 'OSC relay offline. This is not a project error: the relay is a local service that forwards WebSocket → UDP. Start `pnpm dev:relay` on this computer and retry.')
          : t('Relay OSC non connesso. Il relay è un servizio locale opzionale per inviare la specifica a Max, SuperCollider o al plugin.', 'OSC relay not connected. It is an optional local service for sending the specification to Max, SuperCollider or the plugin.')

  return (
    <div className="spec-shell" lang={lang}>
      <header className="spec-topbar">
        <button type="button" className="spec-back" onClick={() => setAppView('play')}>
          ← {t('Studio', 'Studio')}
        </button>
        <div className="spec-brand">
          <span className="spec-brand-mark">M</span>
          <div>
            <strong>SED</strong>
            <small>{t('Laboratorio acustico', 'Acoustic Spec Lab')}</small>
          </div>
        </div>
        <nav
          className="spec-tabs"
          role="tablist"
          aria-label={t('Sezioni del laboratorio', 'Specification lab sections')}
          aria-orientation="horizontal"
        >
          {tabs.map((candidate, index) => (
            <button
              key={candidate.id}
              id={`spec-tab-${candidate.id}`}
              type="button"
              role="tab"
              aria-selected={section === candidate.id}
              aria-controls={`spec-panel-${candidate.id}`}
              tabIndex={section === candidate.id ? 0 : -1}
              className={section === candidate.id ? 'is-active' : ''}
              onClick={() => setSection(candidate.id)}
              onKeyDown={(event) => onTabKeyDown(event, index)}
            >
              {candidate.label}
            </button>
          ))}
        </nav>
        <div className="spec-top-actions">
          <div className="spec-lang" role="group" aria-label={t('Lingua', 'Language')}>
            <button type="button" aria-pressed={lang === 'it'} className={lang === 'it' ? 'is-active' : ''} onClick={() => setLang('it')}>IT</button>
            <button type="button" aria-pressed={lang === 'en'} className={lang === 'en' ? 'is-active' : ''} onClick={() => setLang('en')}>EN</button>
          </div>
          <button type="button" className="spec-site-link" onClick={() => setAppView('site')}>{t('Sito SED', 'SED site')} ↗</button>
          <button type="button" className="spec-return" onClick={() => setAppView('play')}>{t('Torna allo Studio', 'Return to Studio')}</button>
        </div>
      </header>

      <div
        className={`spec-sync-row ${play.applied ? 'is-synced' : 'is-dirty'}`}
        role="status"
        aria-live="polite"
      >
        <span className="sync-dot" aria-hidden="true" />
        <strong>
          {play.applied
            ? t('Sincronizzato con lo spazio costruito', 'Synchronised with the built space')
            : t('Spazio modificato · la simulazione non è aggiornata', 'Space modified · the simulation is not up to date')}
        </strong>
        <small>
          {play.objects.length} {t('oggetti Inhabiting', 'Inhabiting objects')} · {session.speakerPlacements.length} speaker · {designItems.length} {t('elementi tecnici', 'technical elements')}
        </small>
        {!play.applied ? (
          <button type="button" onClick={sync}>{t('Sincronizza ora', 'Sync now')}</button>
        ) : null}
      </div>

      {section === 'blueprint' ? (
        <div
          className="spec-workspace"
          id="spec-panel-blueprint"
          role="tabpanel"
          aria-labelledby="spec-tab-blueprint"
        >
          <LayerPanel lang={lang} />
          <section className="spec-stage">
            <div className="spec-stage-toolbar">
              <span>{t('Blueprint acustico', 'Acoustic blueprint')}</span>
              <label>
                {t('Banda', 'Band')}
                <select value={frequencyHz} onChange={(event) => setFrequency(Number(event.target.value))}>
                  {FREQUENCIES.map((frequency) => (
                    <option key={frequency} value={frequency}>
                      {frequency >= 1000 ? `${frequency / 1000} kHz` : `${frequency} Hz`}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className={showPolar ? 'is-active' : ''} onClick={togglePolar}>
                {t('Polari', 'Polar balloons')}
              </button>
              <button type="button" className={showHeatmap ? 'is-active' : ''} onClick={toggleHeatmap}>
                {t('Mappa', 'Coverage map')}
              </button>
            </div>
            <div className="spec-stage-canvas">
              <StudioCanvas />
            </div>
            <div className="spec-stage-hud">
              <span>{t('Dispersione polare · copertura · fase', 'Polar dispersion · coverage · phase')}</span>
              <span>{t('Tier 2 · lettura fisica della composizione Inhabiting', 'Tier 2 · physical reading of the Inhabiting composition')}</span>
            </div>
          </section>
          <div className="spec-right">
            <section className={`spec-osc-card spec-osc-card--${oscStatus}`} aria-live="polite">
              <div className="spec-osc-head">
                <h3>OSC relay</h3>
                <span>{oscStatus}</span>
              </div>
              <p>{oscMessage}</p>
              <code>{OSC_RELAY_URL}</code>
              <div className="spec-osc-actions">
                <button type="button" onClick={() => void toggleOsc()} disabled={busy}>
                  {oscStatus === 'connected'
                    ? t('Disconnetti', 'Disconnect')
                    : oscStatus === 'error'
                      ? t('Riprova', 'Retry')
                      : t('Connetti', 'Connect')}
                </button>
                {oscStatus !== 'connected' ? <small>{t('Avvia: pnpm dev:relay', 'Run: pnpm dev:relay')}</small> : null}
              </div>
            </section>
            <Inspector lang={lang} />
          </div>
        </div>
      ) : null}

      {section === 'geometry' ? (
        <div
          className="spec-tab-panel"
          id="spec-panel-geometry"
          role="tabpanel"
          aria-labelledby="spec-tab-geometry"
        >
          <SpecGeometry />
        </div>
      ) : null}

      {section === 'materials' ? (
        <div
          className="spec-page"
          id="spec-panel-materials"
          role="tabpanel"
          aria-labelledby="spec-tab-materials"
        >
          <MaterialTablePanel environment={environment} />
          <LandscapePanel />
        </div>
      ) : null}

      {section === 'bom' ? (
        <div
          className="spec-page"
          id="spec-panel-bom"
          role="tabpanel"
          aria-labelledby="spec-tab-bom"
        >
          <BomPanel session={session} profiles={profiles} />
        </div>
      ) : null}
    </div>
  )
}
