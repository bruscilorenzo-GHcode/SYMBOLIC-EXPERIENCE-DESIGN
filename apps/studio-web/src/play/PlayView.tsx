import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { PlayComposition } from '@aura-spec/play-engine'
import {
  PLAY_GESTURES,
  PLAY_MATERIALS,
  PLAY_MISSIONS,
  PLAY_PARAMETERS,
  PLAY_RENDER_MODES,
  PLAY_SPECIES,
  PLAY_STORAGE_KEY,
  composeTick,
  describeParameter,
  getPlayProgression,
  nextUnlockHint,
  parsePlayProgress,
  scoreLabel,
  serializePlayProgress,
  type PlayRenderModeDefinition,
  type PlayScore,
} from '@aura-spec/play-engine'
import { useStudioStore } from '../state/store'
import { PlayPlan } from './PlayPlan'
import { PlaySeedDialog } from './PlaySeedDialog'
import { PlayScene } from './scene/PlayScene'
import { PlayAudition } from './audio/playAudition'
import './play.css'

const SCORE_DIMENSIONS: Array<{ key: keyof PlayScore; label: string; color: string }> = [
  { key: 'musicalCoherence', label: 'Coerenza', color: '#f2d38e' },
  { key: 'ecologicalBalance', label: 'Ecologia', color: '#9cdb9b' },
  { key: 'inclusion', label: 'Inclusione', color: '#d5adff' },
  { key: 'spatialClarity', label: 'Chiarezza', color: '#8bdde0' },
  { key: 'novelty', label: 'Novità', color: '#f0a5a1' },
]

export function PlayView() {
  const play = useStudioStore((state) => state.play)
  const setPlayProgress = useStudioStore((state) => state.setPlayProgress)
  const setPlayParameter = useStudioStore((state) => state.setPlayParameter)
  const applyPlayGesture = useStudioStore((state) => state.applyPlayGesture)
  const setPlayRenderMode = useStudioStore((state) => state.setPlayRenderMode)
  const selectPlayMission = useStudioStore((state) => state.selectPlayMission)
  const commitPlayMission = useStudioStore((state) => state.commitPlayMission)
  const applyPlayComposition = useStudioStore((state) => state.applyPlayComposition)
  const resetPlay = useStudioStore((state) => state.resetPlay)
  const environment = useStudioStore((state) => state.environment)
  const session = useStudioStore((state) => state.session)
  const site = useStudioStore((state) => state.site)
  const openSpecLab = useStudioStore((state) => state.openSpecLab)
  const setPlayObjectMode = useStudioStore((state) => state.setPlayObjectMode)
  const placePlayObject = useStudioStore((state) => state.placePlayObject)
  const updatePlayObject = useStudioStore((state) => state.updatePlayObject)
  const removePlayObject = useStudioStore((state) => state.removePlayObject)
  const setPlayHabitat = useStudioStore((state) => state.setPlayHabitat)
  const setPlayPersona = useStudioStore((state) => state.setPlayPersona)

  const [hydrated, setHydrated] = useState(false)
  const [view, setView] = useState<'plan' | 'world'>('plan')
  const [expanded, setExpanded] = useState(false)
  const [seedOpen, setSeedOpen] = useState(false)
  const [auditioning, setAuditioning] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const audioRef = useRef<PlayAudition | null>(null)
  const toastTimer = useRef<number | null>(null)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(PLAY_STORAGE_KEY)
      if (stored) setPlayProgress(parsePlayProgress(stored))
    } catch {
      // Local-only progress; storage can be unavailable in private modes.
    }
    setHydrated(true)
  }, [setPlayProgress])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(PLAY_STORAGE_KEY, serializePlayProgress(play))
    } catch {
      // Never block play on persistence.
    }
  }, [hydrated, play])

  const tick = useMemo(() => composeTick(play), [play])
  const { composition, progression, mission, missionEvaluation, missions } = tick
  const renderMode =
    PLAY_RENDER_MODES.find(
      (candidate) =>
        candidate.id === play.renderMode && progression.unlockedRenderModeIds.includes(candidate.id),
    ) ?? PLAY_RENDER_MODES[0]!

  const announce = useCallback((message: string) => {
    setToast(message)
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3400)
  }, [])

  useEffect(
    () => () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
      audioRef.current?.stop()
    },
    [],
  )

  useEffect(() => {
    if (!auditioning) return
    audioRef.current?.update(composition)
  }, [auditioning, composition])

  const toggleAudition = async (): Promise<void> => {
    if (auditioning) {
      audioRef.current?.stop()
      setAuditioning(false)
      announce('Il giardino tace. La forma resta.')
      return
    }
    try {
      const engine = audioRef.current ?? new PlayAudition()
      audioRef.current = engine
      await engine.start(composition)
      setAuditioning(true)
      setAudioError(null)
      announce('Il giardino canta. Le quattro voci sono aperte.')
    } catch (error) {
      setAudioError(error instanceof Error ? error.message : String(error))
      setAuditioning(false)
      announce('L’audio non è disponibile in questo browser.')
    }
  }

  const verifyMission = (): void => {
    const result = commitPlayMission(mission.id)
    if (!result) {
      announce('Questa soglia non esiste ancora.')
      return
    }
    if (result.passed) {
      const before = getPlayProgression(play.completedMissionIds)
      const after = getPlayProgression([...play.completedMissionIds, mission.id])
      const openings = [
        ...PLAY_SPECIES.filter(
          (species) =>
            after.unlockedSpeciesIds.includes(species.id) &&
            !before.unlockedSpeciesIds.includes(species.id),
        ).map((species) => species.commonName),
        ...PLAY_MATERIALS.filter(
          (material) =>
            after.unlockedMaterialIds.includes(material.id) &&
            !before.unlockedMaterialIds.includes(material.id),
        ).map((material) => material.italian),
        ...PLAY_RENDER_MODES.filter(
          (mode) =>
            after.unlockedRenderModeIds.includes(mode.id) &&
            !before.unlockedRenderModeIds.includes(mode.id),
        ).map((mode) => mode.italian),
        ...PLAY_GESTURES.filter(
          (gesture) =>
            after.unlockedGestureIds.includes(gesture.id) &&
            !before.unlockedGestureIds.includes(gesture.id),
        ).map((gesture) => gesture.italian),
      ].slice(0, 3)
      announce(
        `La soglia è varcata · ${mission.italian}.${openings.length > 0 ? ` Si aprono: ${openings.join(' · ')}.` : ' Il giardino ricorda.'}`,
      )
    } else {
      const missing = result.requirements.filter((requirement) => !requirement.passed)
      announce(
        missing.length > 0
          ? `Manca ancora: ${missing.map((requirement) => requirement.label.toLowerCase()).join(' · ')}`
          : 'Il giardino non risponde ancora a questa soglia.',
      )
    }
  }

  const applyToWorld = (): void => {
    const applied = applyPlayComposition()
    if (applied) {
      announce('Il giardino è entrato nel mondo · Spatial e Design lo vedono.')
    }
  }

  const exportComposition = (): void => {
    const payload = {
      schemaVersion: 'aura-spec.play.export.v1',
      exportedAt: new Date().toISOString(),
      progress: play,
      progression,
      composition,
      environment,
      session,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'aura-play-giardino.json'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1200)
    announce('Il seme è stato raccolto in un file.')
  }

  const activeIndex = PLAY_MISSIONS.findIndex((candidate) => candidate.id === mission.id)
  const speciesNames = PLAY_SPECIES.filter((species) =>
    progression.unlockedSpeciesIds.includes(species.id),
  )
    .slice(-4)
    .map((species) => species.commonName)
  const materialNames = PLAY_MATERIALS.filter((material) =>
    progression.unlockedMaterialIds.includes(material.id),
  )
    .slice(-4)
    .map((material) => material.italian)
  const descriptor = composition.music.descriptor
  const modeButton = (candidate: PlayRenderModeDefinition): void => {
    setPlayRenderMode(candidate.id)
    announce(`Modo ${candidate.italian} · ${candidate.description}`)
  }

  return (
    <main className={`play-view${expanded ? ' is-expanded' : ''}`}>
      {expanded ? (
        <div className="workspace-bar">
          <span>Area di lavoro · {play.habitatId.replace(/-/g, ' ')}</span>
          <div>
            <button type="button" onClick={() => setExpanded(false)}>Torna al giardino</button>
            <button
              type="button"
              className="workspace-spec"
              onClick={() => {
                applyToWorld()
                openSpecLab('blueprint')
              }}
            >
              Flip to Technical Spec
            </button>
          </div>
        </div>
      ) : null}
      {view === 'world' ? (
        <>
          <div className="play-canvas" aria-hidden="true">
            <PlayScene
              composition={composition}
              palette={renderMode.palette}
              mode={renderMode}
              objects={play.objects}
            />
          </div>
          <div className="play-vignette" aria-hidden="true" />
          <div className="play-grain" aria-hidden="true" />
        </>
      ) : null}

      <header className="play-head">
        <span className="play-eyebrow">AURA PLAY · GIARDINO GIOCABILE</span>
        <div className="play-view-switch" role="group" aria-label="Vista di gioco">
          <button type="button" className={view === 'plan' ? 'is-active' : ''} onClick={() => setView('plan')}>
            Piano
          </button>
          <button type="button" className={view === 'world' ? 'is-active' : ''} onClick={() => setView('world')}>
            Giardino 3D
          </button>
          <button type="button" className={expanded ? 'is-active' : ''} onClick={() => setExpanded((value) => !value)}>
            {expanded ? 'Esci' : 'Area di lavoro'}
          </button>
        </div>
        <h1>
          {view === 'plan' ? (
            <>Il programma è la <em>prima partitura</em>.</>
          ) : (
            <>Lo spazio <em>giocabile</em> è immediato.</>
          )}
        </h1>
        <p className="play-translation">
          {view === 'plan'
            ? 'The program is the first score. The playable space is immediate.'
            : 'The playable space is immediate. The program is the first score.'}
        </p>
        <p className="play-alliance">
          Per architetti · designer · developer · musicisti — integriamo, non sostituiamo.
        </p>
        <p className="play-descriptor">
          {poeticMode(descriptor.mode)} · {descriptor.register === 'low' ? 'sotto' : descriptor.register === 'high' ? 'in alto' : 'al centro'} · {composition.season.label.toLowerCase()}
        </p>

      </header>

      <div className="play-season">
        <span className="season-orbit" aria-hidden="true" />
        <span>
          {composition.season.label}
          <small>{Math.round(composition.season.temperatureC)}° · {Math.round(descriptor.tempoBpm)} respiri</small>
        </span>
      </div>

      <section className="play-mission-card" aria-label="Missione attiva">
        <div className="mission-topline">
          <span>SOGLIA {String(activeIndex + 1).padStart(2, '0')}</span>
          <span>{progression.title}</span>
        </div>
        <h2>{mission.italian}</h2>
        <p className="mission-translation">{mission.title}</p>
        <p className="mission-description">{mission.description}</p>
        <div className="mission-requirements">
          {missionEvaluation.requirements.map((requirement) => (
            <div
              key={requirement.id}
              className={`mission-requirement${requirement.passed ? ' is-passed' : ''}`}
              title={requirement.hint}
            >
              <span className="requirement-dot" aria-hidden="true" />
              <span>{requirement.label}</span>
            </div>
          ))}
        </div>
        <div className="mission-actions">
          <button type="button" className="mission-verify" onClick={verifyMission}>
            {missionEvaluation.passed ? 'Varca la soglia' : 'Ascolta la risposta'}
          </button>
          <span className="mission-hint">{mission.poeticHint}</span>
        </div>
        <div className="mission-dots" aria-label="Percorso delle missioni">
          {missions.map(({ mission: candidate, completed }) => (
            <button
              key={candidate.id}
              type="button"
              className={`mission-dot${completed ? ' is-complete' : ''}${candidate.id === mission.id ? ' is-active' : ''}`}
              aria-label={`${candidate.italian}${completed ? ', compiuta' : ''}`}
              title={candidate.italian}
              onClick={() => selectPlayMission(candidate.id)}
            >
              {completed ? '✓' : String(candidate.index).padStart(2, '0')}
            </button>
          ))}
        </div>
        <div className="mission-codex" title={`Specie: ${speciesNames.join(', ')} · Materie: ${materialNames.join(', ')}`}>
          <span>ERBARIO</span>
          <span>{speciesNames.join(' · ')}</span>
          <span>MATERIE</span>
          <span>{materialNames.join(' · ')}</span>
        </div>
      </section>

      {view === 'world' ? <ScoreConstellation scores={composition.scores} title={progression.title} /> : null}

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
        />
      ) : null}

      <section className="play-parameter-console" aria-label="Parametri del giardino">
        <div className="console-head">
          <span>SUONA IL GIARDINO</span>
          <span>{progression.unlockedGestureIds.length} gesti aperti · {nextUnlockHint(play.completedMissionIds)}</span>
        </div>
        <div className="parameter-row">
          {PLAY_PARAMETERS.map((parameter) => {
            const value = play.parameters[parameter.id]
            return (
              <label
                key={parameter.id}
                className="play-parameter"
                style={{ '--parameter-hue': `${parameter.hue}` } as CSSProperties}
                title={parameter.hint}
              >
                <span className="parameter-orb" aria-hidden="true" />
                <span className="parameter-label">{parameter.italian}</span>
                <span className="parameter-english">{parameter.english}</span>
                <input
                  aria-label={`${parameter.italian} · ${parameter.english}`}
                  type="range"
                  min={parameter.min}
                  max={parameter.max}
                  step={parameter.step}
                  value={value}
                  onChange={(event) => setPlayParameter(parameter.id, Number(event.target.value))}
                />
                <span className="parameter-state">{describeParameter(parameter.id, value)}</span>
              </label>
            )
          })}
        </div>
        <div className="gesture-row">
          {PLAY_GESTURES.filter((gesture) => progression.unlockedGestureIds.includes(gesture.id)).map((gesture) => (
            <button
              key={gesture.id}
              type="button"
              className={`gesture-pill${play.lastGesture === gesture.id ? ' is-active' : ''}`}
              title={gesture.description}
              onClick={() => {
                applyPlayGesture(gesture.id)
                announce(`${gesture.italian} · ${gesture.description}`)
              }}
            >
              <span aria-hidden="true">✦</span>
              {gesture.italian}
            </button>
          ))}
        </div>
      </section>

      <aside className="play-tools" aria-label="Azioni del giardino">
        <div className="render-mode-row" aria-label="Modi di render">
          {PLAY_RENDER_MODES.filter((candidate) => progression.unlockedRenderModeIds.includes(candidate.id)).map(
            (candidate) => (
              <button
                key={candidate.id}
                type="button"
                className={`render-mode${candidate.id === renderMode.id ? ' is-active' : ''}`}
                aria-pressed={candidate.id === renderMode.id}
                title={candidate.description}
                onClick={() => modeButton(candidate)}
              >
                {candidate.italian}
              </button>
            ),
          )}
        </div>
        <div className="tool-row">
          <button
            type="button"
            className={`play-listen${auditioning ? ' is-playing' : ''}`}
            aria-pressed={auditioning}
            onClick={() => void toggleAudition()}
          >
            <span className="listen-glyph" aria-hidden="true">{auditioning ? 'Ⅱ' : '▶'}</span>
            {auditioning ? 'Silenzia' : 'Ascolta'}
          </button>
          <button type="button" onClick={applyToWorld}>Semina nel mondo</button>
          <button type="button" onClick={exportComposition}>Raccogli il seme</button>
          <button
            type="button"
            onClick={() => {
              applyToWorld()
              openSpecLab('blueprint')
            }}
          >
            Flip to Technical Spec
          </button>
          <button type="button" className="seed-cta" onClick={() => setSeedOpen(true)}>
            Parliamo del progetto
          </button>
          <button type="button" className="quiet" onClick={() => { resetPlay(); announce('Un nuovo giardino, con la stessa luce.') }}>
            Nuovo giardino
          </button>
        </div>
        {audioError && <span className="play-audio-error">Audio: {audioError}</span>}
      </aside>

      <div className="play-data-note">
        <span>DATA→MUSIC</span>
        <span>
          aria {Math.round(composition.environmental.airQuality * 100)} · acqua {Math.round(composition.environmental.waterQuality * 100)} · peso {Math.round(composition.music.dataWeight * 100)}
        </span>
        <span>audio locale · nessun dato lascia il giardino</span>
      </div>

      {toast && (
        <div className="play-toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}

      {seedOpen ? (
        <PlaySeedDialog
          composition={composition}
          progression={progression}
          objectMode={play.objectMode}
          onClose={() => setSeedOpen(false)}
        />
      ) : null}
    </main>
  )
}

function poeticMode(mode: PlayComposition['music']['descriptor']['mode']): string {
  return {
    dorian: 'dorico',
    aeolian: 'eolio',
    lydian: 'lidio',
    phrygian: 'frigio',
    ionian: 'ionio',
    mixolydian: 'misolidio',
    locrian: 'locrio',
  }[mode]
}

function ScoreConstellation({ scores, title }: { scores: PlayScore; title: string }) {
  const centre = { x: 118, y: 112 }
  const nodes = SCORE_DIMENSIONS.map((dimension, index) => {
    const angle = (-Math.PI * 0.82) + (index / (SCORE_DIMENSIONS.length - 1)) * Math.PI * 0.64
    const value = scores[dimension.key]
    const radius = 22 + value * 58
    return {
      ...dimension,
      value,
      x: centre.x + Math.cos(angle) * radius,
      y: centre.y + Math.sin(angle) * radius,
    }
  })
  const polygon = nodes.map((node) => `${node.x},${node.y}`).join(' ')

  return (
    <section className="play-score" aria-label="Costellazione del giardino">
      <div className="score-title">
        <span>COSTELLAZIONE</span>
        <span>{title}</span>
      </div>
      <svg viewBox="0 0 236 156" role="img" aria-label="Cinque dimensioni del giardino">
        <defs>
          <radialGradient id="score-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff6d5" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#6cc8b5" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={centre.x} cy={centre.y} r="74" className="score-orbit" />
        <circle cx={centre.x} cy={centre.y} r="43" className="score-orbit score-orbit-inner" />
        <circle cx={centre.x} cy={centre.y} r="28" fill="url(#score-core)" />
        <polygon points={polygon} className="score-shape" />
        {nodes.map((node) => (
          <g key={node.key}>
            <line x1={centre.x} y1={centre.y} x2={node.x} y2={node.y} className="score-ray" />
            <circle cx={node.x} cy={node.y} r={3.3 + node.value * 4.5} fill={node.color} className="score-node" />
            <text x={node.x} y={node.y - 10} textAnchor="middle" className="score-label">
              {node.label}
            </text>
          </g>
        ))}
        <circle cx={centre.x} cy={centre.y} r="3.2" className="score-centre" />
      </svg>
      <div className="score-readout">
        {nodes.map((node) => (
          <span key={node.key} style={{ '--score-color': node.color } as CSSProperties}>
            {node.label} <b>{scoreLabel(node.value)}</b>
          </span>
        ))}
      </div>
    </section>
  )
}
