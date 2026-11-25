import { useEffect, useMemo, useRef, useState } from 'react'
import {
  IDIOM_DEFINITIONS,
  habitatArchetypes,
  PLAY_OBJECT_CATALOG,
  PLAY_PARAMETERS,
  PLAY_RENDER_MODES,
  playRenderModeLabel,
  composeTick,
} from '@aura-spec/play-engine'
import { descriptorLabel } from '@aura-spec/landscape-culture'
import { SyntagmaAudition } from './audio/syntagmaAudition'
import type { StemSourceReadout } from './audio/stemEngine'
import { PlayPlan } from './PlayPlan'
import { PlayScene } from './scene/PlayScene'
import { PlaySeedDialog } from './PlaySeedDialog'
import { useStudioStore } from '../state/store'
import './play.css'
import './studio.css'

export function StudioView() {
  const lang = useStudioStore((state) => state.lang)
  const setLang = useStudioStore((state) => state.setLang)
  const play = useStudioStore((state) => state.play)
  const site = useStudioStore((state) => state.site)
  const setPlayParameter = useStudioStore((state) => state.setPlayParameter)
  const setPlayRenderMode = useStudioStore((state) => state.setPlayRenderMode)
  const setPlayIdiom = useStudioStore((state) => state.setPlayIdiom)
  const setPlayHabitat = useStudioStore((state) => state.setPlayHabitat)
  const setPlayPersona = useStudioStore((state) => state.setPlayPersona)
  const setPlayObjectMode = useStudioStore((state) => state.setPlayObjectMode)
  const placePlayObject = useStudioStore((state) => state.placePlayObject)
  const updatePlayObject = useStudioStore((state) => state.updatePlayObject)
  const removePlayObject = useStudioStore((state) => state.removePlayObject)
  const commitPlayMission = useStudioStore((state) => state.commitPlayMission)
  const applyPlayComposition = useStudioStore((state) => state.applyPlayComposition)
  const openSpecLab = useStudioStore((state) => state.openSpecLab)
  const setAppView = useStudioStore((state) => state.setAppView)
  const resetPlay = useStudioStore((state) => state.resetPlay)

  const [view, setView] = useState<'plan' | 'world'>('plan')
  const [sideOpen, setSideOpen] = useState(false)
  const [narrow, setNarrow] = useState(false)
  const [seedOpen, setSeedOpen] = useState(false)
  const [auditioning, setAuditioning] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [stemSources, setStemSources] = useState<StemSourceReadout[]>([])
  const audioRef = useRef<SyntagmaAudition | null>(null)
  const toastTimer = useRef<number | null>(null)
  const drawerCloseRef = useRef<HTMLButtonElement>(null)

  const t = (it: string, en: string): string => (lang === 'it' ? it : en)

  useEffect(() => {
    const query = window.matchMedia('(max-width: 1100px)')
    const sync = (): void => setNarrow(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!sideOpen) return
    if (narrow) drawerCloseRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setSideOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [narrow, sideOpen])

  const tick = useMemo(() => composeTick(play), [play])
  const { composition, progression, mission, missionEvaluation } = tick
  const renderMode =
    PLAY_RENDER_MODES.find(
      (mode) => mode.id === play.renderMode && progression.unlockedRenderModeIds.includes(mode.id),
    ) ?? PLAY_RENDER_MODES[0]!
  const catalogue = PLAY_OBJECT_CATALOG[play.objectMode]
  const quickKinds =
    play.objectMode === 'landscape'
      ? (['speaker', 'tree-large', 'shrub', 'water', 'canopy', 'bench'] as const)
      : (['speaker', 'table', 'chair', 'sofa', 'window', 'wall'] as const)

  const announce = (message: string): void => {
    setToast(message)
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3200)
  }

  useEffect(
    () => () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
      audioRef.current?.stop()
    },
    [],
  )

  useEffect(() => {
    if (!auditioning) {
      setStemSources([])
      return
    }
    audioRef.current?.update(composition)
    const timer = window.setInterval(() => {
      setStemSources(audioRef.current?.getSources() ?? [])
    }, 450)
    return () => window.clearInterval(timer)
  }, [auditioning, composition])

  const toggleAudio = async (): Promise<void> => {
    if (auditioning) {
      audioRef.current?.stop()
      setAuditioning(false)
      return
    }
    try {
      const engine = audioRef.current ?? new SyntagmaAudition()
      audioRef.current = engine
      await engine.start(composition)
      setAuditioning(true)
      setAudioError(null)
    } catch (error) {
      setAudioError(error instanceof Error ? error.message : String(error))
      setAuditioning(false)
    }
  }

  const quickAdd = (kind: (typeof quickKinds)[number]): void => {
    const index = play.objects.length
    const x = ((index % 4) - 1.5) * 2.2
    const z = ((Math.floor(index / 4) % 3) - 1) * 2.4
    placePlayObject(kind, x, z)
    announce(t(`Aggiunto: ${catalogue.find((item) => item.kind === kind)?.italian ?? kind}`, `Added: ${catalogue.find((item) => item.kind === kind)?.english ?? kind}`))
  }

  const verifyMission = (): void => {
    const evaluation = commitPlayMission(mission.id)
    if (evaluation?.passed) {
      announce(t('Soglia superata. Una nuova apertura.', 'Threshold crossed. A new opening.'))
    } else {
      announce(t('Il luogo non risponde ancora. Ascolta e regola.', 'The place is not answering yet. Listen and tune.'))
    }
  }

  const openSpec = (): void => {
    applyPlayComposition()
    openSpecLab('blueprint')
  }

  return (
    <div className="studio-shell" lang={lang}>
      <header className="studio-topbar">
        <button type="button" className="studio-back" onClick={() => setAppView('site')}>
          {t('← Sito MAS', '← MAS site')}
        </button>
        <div className="studio-brand">
          <span className="studio-brand-mark">M</span>
          <div>
            <strong>MAS</strong>
            <small>{t('Studio Inhabiting', 'Inhabiting Studio')}</small>
          </div>
        </div>
        <div className="studio-top-actions">
          <div className="studio-view-switch" role="group" aria-label={t('Vista dello studio', 'Studio view')}>
            <button type="button" aria-pressed={view === 'plan'} className={view === 'plan' ? 'is-active' : ''} onClick={() => setView('plan')}>
              {t('Piano 2D', '2D Plan')}
            </button>
            <button type="button" aria-pressed={view === 'world'} className={view === 'world' ? 'is-active' : ''} onClick={() => setView('world')}>
              {t('Giardino 3D', '3D Garden')}
            </button>
          </div>
          <div className="studio-lang" role="group" aria-label={t('Lingua', 'Language')}>
            <button type="button" aria-pressed={lang === 'it'} className={lang === 'it' ? 'is-active' : ''} onClick={() => setLang('it')}>IT</button>
            <button type="button" aria-pressed={lang === 'en'} className={lang === 'en' ? 'is-active' : ''} onClick={() => setLang('en')}>EN</button>
          </div>
          <button type="button" className="studio-spec-link" onClick={openSpec}>
            {t('Specifica tecnica', 'Technical spec')} ↗
          </button>
          <button
            type="button"
            className={`studio-controls-toggle${sideOpen ? ' is-active' : ''}`}
            aria-expanded={sideOpen}
            aria-controls="studio-controls"
            onClick={() => setSideOpen((value) => !value)}
          >
            {t('Controlli', 'Controls')}
          </button>
        </div>
      </header>

      <div className="studio-body">
        <main className="studio-workspace">
          <div className="studio-workspace-head">
            <div>
              <strong>{t('Spazio in costruzione', 'Space under construction')}</strong>
              <span>{play.objects.length} {t('oggetti', 'objects')} · {composition.music.descriptorLabel}</span>
            </div>
            <div className="studio-quick-add">
              <span>{t('Aggiungi', 'Quick add')}</span>
              {quickKinds.map((kind) => {
                const item = catalogue.find((candidate) => candidate.kind === kind)
                return (
                  <button key={kind} type="button" onClick={() => quickAdd(kind)} title={item?.hint}>
                    <i style={{ background: item?.color }} />
                    {lang === 'it' ? item?.italian : item?.english}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="studio-canvas">
            {view === 'plan' ? (
              <PlayPlan
                composition={composition}
                objects={play.objects}
                objectMode={play.objectMode}
                site={site}
                onMode={setPlayObjectMode}
                onPlace={placePlayObject}
                onUpdate={updatePlayObject}
                onRemove={removePlayObject}
                onPersona={setPlayPersona}
                habitatId={play.habitatId}
                onHabitat={setPlayHabitat}
                lang={lang}
              />
            ) : (
              <PlayScene
                composition={composition}
                palette={renderMode.palette}
                mode={renderMode}
                objects={play.objects}
                interactive
              />
            )}
          </div>
        </main>

        {narrow && sideOpen ? (
          <button
            type="button"
            className="studio-drawer-scrim"
            aria-label={t('Chiudi i controlli', 'Close controls')}
            onClick={() => setSideOpen(false)}
          />
        ) : null}
        <aside
          id="studio-controls"
          className={`studio-side${sideOpen ? ' is-open' : ''}`}
          aria-hidden={narrow && !sideOpen ? true : undefined}
          inert={narrow && !sideOpen}
        >
          <div className="studio-drawer-head">
            <span>{t('Controlli', 'Controls')}</span>
            <button
              ref={drawerCloseRef}
              type="button"
              className="studio-drawer-close"
              aria-label={t('Chiudi i controlli', 'Close controls')}
              onClick={() => setSideOpen(false)}
            >
              ×
            </button>
          </div>
          <section className="studio-card">
            <h2>{t('Habitat', 'Habitat')}</h2>
            <select
              className="studio-habitat-select"
              value={play.habitatId}
              onChange={(event) => setPlayHabitat(event.target.value)}
            >
              {(['indoor', 'outdoor'] as const).map((domain) => (
                <optgroup key={domain} label={domain === 'indoor' ? t('Interni', 'Interiors') : t('Paesaggio', 'Landscape')}>
                  {habitatArchetypes(domain).map((archetype) => (
                    <option key={archetype.id} value={archetype.id}>
                      {lang === 'it' ? archetype.italian : archetype.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="studio-habitat-note">{t('Il cambio di habitat transita colori, nebbia, cielo e luci in 0,6 s.', 'Habitat changes crossfade colours, fog, sky and lights over 0.6 s.')}</p>
          </section>

          <section className="studio-card studio-card--light">
            <div className="studio-card-head">
              <h2>{t('Luce naturale', 'Natural light')}</h2>
              <output>{Math.round(play.parameters.light * 100)}%</output>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={play.parameters.light}
              aria-label={t('Luce naturale', 'Natural light')}
              onChange={(event) => setPlayParameter('light', Number(event.target.value))}
            />
            <div className="studio-light-scale">
              <span>{t('Notte', 'Night')}</span>
              <span>{t('Giorno', 'Day')}</span>
            </div>
          </section>

          <section className="studio-card studio-card--idiom">
            <h2>{t('Mondo musicale', 'Musical world')}</h2>
            <div className="studio-idiom-grid">
              {IDIOM_DEFINITIONS.map((idiom) => (
                <button
                  key={idiom.id}
                  type="button"
                  className={play.idiomId === idiom.id ? 'is-active' : ''}
                  aria-pressed={play.idiomId === idiom.id}
                  onClick={() => setPlayIdiom(idiom.id)}
                  title={idiom.description}
                >
                  {lang === 'it' ? idiom.italian : idiom.label}
                </button>
              ))}
            </div>
            <p className="studio-idiom-copy">{composition.music.idiom.description}</p>
            <div className="studio-idiom-meta">
              <span>{lang === 'it' ? composition.music.idiomScore.scaleNameIt : composition.music.idiomScore.scaleName}</span>
              <span>{composition.music.idiom.soundfont === 'maestro' ? 'Maestro · ' : ''}{lang === 'it' ? composition.music.idiom.instruments.harmonic.italian : composition.music.idiom.instruments.harmonic.label} + {lang === 'it' ? composition.music.idiom.instruments.melodic.italian : composition.music.idiom.instruments.melodic.label}</span>
              <span>{composition.music.idiom.instruments.drone.label} · {composition.music.idiom.instruments.ambient.label}</span>
              <span>{composition.music.idiomScore.harmonyLabel}</span>
              <span>{lang === 'it' ? composition.music.idiomScore.rhythmLabel : composition.music.idiomScore.rhythmLabelEn}</span>
              <span>{t('tensione', 'tension')} {composition.music.idiomScore.tension.toFixed(2)}</span>
            </div>
            <p className="studio-generative-note">{t('Frase generativa · muta a ogni ciclo', 'Generative phrase · evolves each cycle')}</p>
          </section>

          <section className="studio-card">
            <h2>{t('Parametri', 'Parameters')}</h2>
            <div className="studio-parameters">
              {PLAY_PARAMETERS.filter((parameter) => parameter.id !== 'light').map((parameter) => (
                <label key={parameter.id}>
                  <span>{lang === 'it' ? parameter.italian : parameter.english}</span>
                  <input
                    type="range"
                    min={parameter.min}
                    max={parameter.max}
                    step={parameter.step}
                    value={play.parameters[parameter.id]}
                    onChange={(event) => setPlayParameter(parameter.id, Number(event.target.value))}
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="studio-card">
            <h2>{t('Missione', 'Mission')}</h2>
            <h3>{lang === 'it' ? mission.italian : mission.title}</h3>
            <p>{lang === 'it' ? mission.poeticHint : mission.description}</p>
            <div className="studio-requirements">
              {missionEvaluation.requirements.map((requirement, index) => (
                <span key={requirement.id} className={requirement.passed ? 'is-passed' : ''}>
                  <i />
                  {lang === 'it' ? requirement.label : `${t('Obiettivo', 'Objective')} ${index + 1}`}
                </span>
              ))}
            </div>
            <button type="button" className="studio-primary" onClick={verifyMission}>
              {missionEvaluation.passed ? t('Varca la soglia', 'Cross the threshold') : t('Ascolta la risposta', 'Listen to the response')}
            </button>
          </section>

          <section className="studio-card">
            <h2>{t('Campo sonoro', 'Sound field')}</h2>
            <div className="studio-render-modes">
              {PLAY_RENDER_MODES.filter((mode) => progression.unlockedRenderModeIds.includes(mode.id)).map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  className={mode.id === renderMode.id ? 'is-active' : ''}
                  aria-pressed={mode.id === renderMode.id}
                  onClick={() => setPlayRenderMode(mode.id)}
                >
                  {playRenderModeLabel(mode, lang)}
                </button>
              ))}
            </div>
            <div className="studio-sound-actions">
              <button type="button" className={auditioning ? 'is-playing' : ''} onClick={() => void toggleAudio()}>
                {auditioning ? t('Silenzia', 'Silence') : t('Ascolta', 'Listen')}
              </button>
              <button type="button" onClick={() => setSeedOpen(true)}>{t('Parliamo del progetto', "Let's talk about the project")}</button>
            </div>
            {stemSources.length > 0 ? (
              <div className="stem-source-readout">
                {stemSources.map((source, index) => (
                  <span key={`${source.part}-${source.source}`}>
                    <strong>P{index + 1}</strong> {source.label} · {source.source} <em>w{source.window + 1}</em>
                  </span>
                ))}
              </div>
            ) : null}
            {audioError ? <p className="studio-audio-error" role="alert">{audioError}</p> : null}
            <div className="studio-footer-actions">
              <button type="button" onClick={openSpec}>{t('Apri specifica tecnica', 'Open technical spec')}</button>
              <button type="button" onClick={() => { resetPlay(); announce(t('Nuovo giardino.', 'New garden.')) }}>
                {t('Nuovo giardino', 'New garden')}
              </button>
            </div>
          </section>
        </aside>
      </div>

      {toast ? <div className="studio-toast" role="status">{toast}</div> : null}
      {seedOpen ? (
        <PlaySeedDialog
          composition={composition}
          progression={progression}
          objectMode={play.objectMode}
          lang={lang}
          onClose={() => setSeedOpen(false)}
        />
      ) : null}
    </div>
  )
}
