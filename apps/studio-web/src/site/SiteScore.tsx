import { useEffect, useMemo, useRef, useState } from 'react'
import {
  IDIOM_DEFINITIONS,
  PLAY_PARAMETERS,
  PLAY_RENDER_MODES,
  SPATIAL_FIELDS,
  adjacentSpatialField,
  composeFromProgress,
  getPlayProgression,
  personaForSpatialField,
  playRenderModeLabel,
  spatialFieldDescription,
  spatialFieldFromPersona,
} from '@aura-spec/play-engine'
import { getHabitatArchetype, habitatArchetypes } from '@aura-spec/inhabiting-model'
import { descriptorLabel } from '@aura-spec/landscape-culture'
import { SyntagmaAudition } from '../play/audio/syntagmaAudition'
import type { StemSourceReadout } from '../play/audio/stemEngine'
import { PlayScene } from '../play/scene/PlayScene'
import { SpatialGlyph, type SpatialProfile } from './SpatialGlyph'
import { PlaySeedDialog } from '../play/PlaySeedDialog'
import { useStudioStore } from '../state/store'
import { SITE_COPY, type SiteLang } from './copy'
import { DaylightControl } from './DaylightControl'

export function SiteScore({ lang }: { lang: SiteLang }) {
  const play = useStudioStore((state) => state.play)
  const setPlayParameter = useStudioStore((state) => state.setPlayParameter)
  const setPlayHabitat = useStudioStore((state) => state.setPlayHabitat)
  const setPlayRenderMode = useStudioStore((state) => state.setPlayRenderMode)
  const setPlayIdiom = useStudioStore((state) => state.setPlayIdiom)
  const setPlayPersona = useStudioStore((state) => state.setPlayPersona)
  const placePlayObject = useStudioStore((state) => state.placePlayObject)
  const applyPlayComposition = useStudioStore((state) => state.applyPlayComposition)
  const openSpecLab = useStudioStore((state) => state.openSpecLab)
  const setAppView = useStudioStore((state) => state.setAppView)

  const [playing, setPlaying] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [briefOpen, setBriefOpen] = useState(false)
  const [stageView, setStageView] = useState<'diagram' | '3d'>('diagram')
  const [stemSources, setStemSources] = useState<StemSourceReadout[]>([])
  const copy = SITE_COPY[lang].score
  const t = (it: string, en: string): string => (lang === 'it' ? it : en)
  const audioRef = useRef<SyntagmaAudition | null>(null)

  const composition = useMemo(() => composeFromProgress(play), [play])
  const progression = getPlayProgression(play.completedMissionIds)
  const habitat = getHabitatArchetype(play.habitatId) ?? getHabitatArchetype('outdoor-mediterranean-garden')!
  const speakerObjects = play.objects.filter((object) => object.kind === 'speaker')
  const leadPersona = speakerObjects[0]?.personaId
  // The first speaker is the single source of truth; the diagram derives its
  // field from it instead of keeping a second state that an effect can reset.
  const diffusion: SpatialProfile = spatialFieldFromPersona(leadPersona)
  const diagramChannels = Math.max(4, speakerObjects.length)
  const renderMode =
    PLAY_RENDER_MODES.find(
      (candidate) =>
        candidate.id === play.renderMode && progression.unlockedRenderModeIds.includes(candidate.id),
    ) ?? PLAY_RENDER_MODES[0]!

  useEffect(() => {
    if (!playing) return
    audioRef.current?.setSpatialField(diffusion)
    audioRef.current?.update(composition)
  }, [composition, diffusion, playing])

  useEffect(() => {
    if (!playing) {
      setStemSources([])
      return
    }
    const timer = window.setInterval(() => {
      setStemSources(audioRef.current?.getSources() ?? [])
    }, 450)
    return () => window.clearInterval(timer)
  }, [playing])

  useEffect(() => () => audioRef.current?.stop(), [])

  const toggleAudio = async (): Promise<void> => {
    if (playing) {
      audioRef.current?.stop()
      setPlaying(false)
      return
    }
    try {
      const engine = audioRef.current ?? new SyntagmaAudition()
      audioRef.current = engine
      await engine.start(composition, diffusion)
      setPlaying(true)
      setAudioError(null)
    } catch (error) {
      setAudioError(error instanceof Error ? error.message : String(error))
      setPlaying(false)
    }
  }

  const fieldLabelById: Record<SpatialProfile, string> = {
    omni: copy.diffusionOmni,
    line: copy.diffusionLine,
    lens: copy.diffusionLens,
  }
  const diffusionOptions = SPATIAL_FIELDS.map((field) => ({
    id: field.id,
    label: fieldLabelById[field.id],
    persona: field.personaId,
    description: spatialFieldDescription(field.id, lang),
  }))

  const chooseDiffusion = (next: SpatialProfile): void => {
    const persona = personaForSpatialField(next)
    const speaker = play.objects.find((object) => object.kind === 'speaker')
    if (speaker) {
      setPlayPersona(speaker.id, persona)
      return
    }
    placePlayObject('speaker', 0, 0)
    const created = useStudioStore
      .getState()
      .play.objects.filter((object) => object.kind === 'speaker')
      .at(-1)
    if (created) setPlayPersona(created.id, persona)
  }

  const cycleDiffusion = (direction: 1 | -1 = 1): void => {
    chooseDiffusion(adjacentSpatialField(diffusion, direction))
  }

  const openStudio = (): void => setAppView('play')
  const openSpec = (): void => {
    applyPlayComposition()
    openSpecLab('blueprint')
  }

  return (
    <section className="site-score section-pad" id="score">
      <div className="site-score-head">
        <div>
          <p className="site-eyebrow">{copy.eyebrow}</p>
          <h2>
            {copy.title[0]}<em>{copy.title[1]}</em>
          </h2>
        </div>
        <p>{copy.intro}</p>
      </div>

      <div className="site-score-workspace" style={{ '--site-accent': habitat.visual.light } as React.CSSProperties}>
        <div className="site-score-controls">
          <fieldset>
            <legend>{copy.habitat}</legend>
            <select
              aria-label={copy.habitat}
              value={play.habitatId}
              onChange={(event) => setPlayHabitat(event.target.value)}
            >
              {(['indoor', 'outdoor'] as const).map((domain) => (
                <optgroup key={domain} label={domain === 'indoor' ? (lang === 'it' ? 'Interni' : 'Interiors') : (lang === 'it' ? 'Paesaggio' : 'Landscape')}>
                  {habitatArchetypes(domain).map((archetype) => (
                    <option key={archetype.id} value={archetype.id}>
                      {lang === 'it' ? archetype.italian : archetype.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="site-control-note">{lang === 'it' ? habitat.invocation : habitat.description}</p>
          </fieldset>

          <fieldset>
            <legend>{copy.diffusion}</legend>
            <div className="site-mode-row">
              {diffusionOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={diffusion === option.id ? 'is-active' : ''}
                  aria-pressed={diffusion === option.id}
                  onClick={() => chooseDiffusion(option.id)}
                >
                  <span aria-hidden="true">{diffusion === option.id ? '✓' : '○'}</span> {option.label}
                </button>
              ))}
            </div>
            <p className="site-control-note">
              {diffusionOptions.find((option) => option.id === diffusion)?.description}
            </p>
          </fieldset>

          <fieldset>
            <legend>{copy.daylight}</legend>
            <DaylightControl
              light={play.parameters.light}
              onChange={(value) => setPlayParameter('light', value)}
              label={copy.daylight}
              night={copy.night}
              day={copy.day}
            />
          </fieldset>

          <fieldset>
            <legend>{copy.parameters}</legend>
            <div className="site-parameter-list">
              {PLAY_PARAMETERS.filter((parameter) => parameter.id !== 'light').map((parameter) => (
                <label key={parameter.id} className="site-parameter">
                  <span>{parameter.italian}</span>
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
          </fieldset>

          <fieldset>
            <legend>{copy.idiom}</legend>
            <div className="site-mode-row">
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
            <p className="site-control-note">
              {composition.music.idiom.soundfont === 'maestro' ? 'Maestro · ' : ''}{lang === 'it' ? composition.music.idiom.instruments.harmonic.italian : composition.music.idiom.instruments.harmonic.label} + {lang === 'it' ? composition.music.idiom.instruments.melodic.italian : composition.music.idiom.instruments.melodic.label} · {lang === 'it' ? composition.music.idiomScore.scaleNameIt : composition.music.idiomScore.scaleName} · {composition.music.idiomScore.harmonyLabel} · {lang === 'it' ? composition.music.idiomScore.rhythmLabel : composition.music.idiomScore.rhythmLabelEn}
            </p>
          </fieldset>

          <fieldset>
            <legend>{copy.view}</legend>
            <div className="site-mode-row">
              <button type="button" className={stageView === 'diagram' ? 'is-active' : ''} aria-pressed={stageView === 'diagram'} onClick={() => setStageView('diagram')}>
                {copy.diagram}
              </button>
              <button type="button" className={stageView === '3d' ? 'is-active' : ''} aria-pressed={stageView === '3d'} onClick={() => setStageView('3d')}>
                {copy.field3d}
              </button>
            </div>
          </fieldset>

          <fieldset>
            <legend>{copy.renderMode}</legend>
            <div className="site-mode-row">
              {PLAY_RENDER_MODES.filter((mode) => progression.unlockedRenderModeIds.includes(mode.id)).map(
                (mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    className={mode.id === renderMode.id ? 'is-active' : ''}
                    aria-pressed={mode.id === renderMode.id}
                    onClick={() => setPlayRenderMode(mode.id)}
                  >
                    {playRenderModeLabel(mode, lang)}
                  </button>
                ),
              )}
            </div>
          </fieldset>
        </div>

        <div className={`site-score-stage site-score-stage--${stageView}`}>
          {stageView === 'diagram' ? (
            <div className="site-score-diagram" data-lead-persona={leadPersona ?? ''}>
              <SpatialGlyph
                habitatName={lang === 'it' ? habitat.italian : habitat.name}
                dimensions={`${habitat.site.widthM} × ${habitat.site.depthM} m`}
                channels={diagramChannels}
                profile={diffusion}
                density={play.parameters.guests}
                movement={play.parameters.wind}
                playing={playing}
                lang={lang}
                onCycleField={cycleDiffusion}
                onSelectField={chooseDiffusion}
              />
            </div>
          ) : (
            <PlayScene
              composition={composition}
              palette={renderMode.palette}
              mode={renderMode}
              objects={play.objects}
              interactive
            />
          )}
          <div className="site-score-overlay site-score-overlay--top">
            <span><i /> {copy.active}</span>
            <span>{lang === 'it' ? habitat.italian : habitat.name}</span>
          </div>
          <div className="site-score-overlay site-score-overlay--bottom">
            <span>{play.objects.length} {copy.objects}</span>
            <span>{composition.music.descriptorLabel}</span>
            <span>{habitat.site.widthM} × {habitat.site.depthM} m</span>
          </div>
        </div>

        <aside className="site-score-summary">
          <p className="site-eyebrow">{copy.direction}</p>
          <h3>{descriptorLabel(composition.music.descriptor)}</h3>
          <p>{lang === 'it' ? habitat.invocation : habitat.description}</p>
          <p className="site-diffusion-summary" role="status" aria-live="polite">
            {copy.diffusion}: {diffusionOptions.find((option) => option.id === diffusion)?.label}
          </p>
          <p className="site-generative-note">{t('Generativo · muta a ogni ciclo', 'Generative · evolves each cycle')}</p>
          <p className="site-idiom-summary">{composition.music.idiom.label} · {composition.music.idiomScore.scaleName} · {composition.music.idiomScore.harmonyLabel}</p>
          <dl className="site-score-metrics">
            <div><dt>{copy.metrics.t60}</dt><dd>{composition.acoustics.t60S.toFixed(2)} s</dd></div>
            <div><dt>{copy.metrics.inclusion}</dt><dd>{Math.round(composition.social.inclusion * 100)}%</dd></div>
            <div><dt>{copy.metrics.clarity}</dt><dd>{Math.round(composition.acoustics.spatialClarity * 100)}%</dd></div>
            <div><dt>{copy.metrics.voice}</dt><dd>{habitat.recommendedPersonaKinds[0]?.replace('-', ' ')}</dd></div>
          </dl>
          <div className="site-score-actions">
            <button type="button" className="site-button site-button--accent" onClick={openStudio}>
              {copy.openStudio}
            </button>
            <button type="button" className="site-button site-button--outline" onClick={openSpec}>
              {copy.openSpec}
            </button>
            <button type="button" className="site-button site-button--dark" onClick={() => setBriefOpen(true)}>
              {copy.request}
            </button>
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
          <button
            type="button"
            className={`site-listen${playing ? ' is-playing' : ''}`}
            onClick={() => void toggleAudio()}
          >
            <span aria-hidden="true">{playing ? 'Ⅱ' : '▶'}</span>
            {playing ? copy.silence : copy.listen}
          </button>
          {audioError ? <p className="site-audio-error" role="alert">{copy.audio}: {audioError}</p> : null}
        </aside>
      </div>

      {briefOpen ? (
        <PlaySeedDialog
          composition={composition}
          progression={progression}
          objectMode={play.objectMode}
          lang={lang}
          onClose={() => setBriefOpen(false)}
        />
      ) : null}
    </section>
  )
}
