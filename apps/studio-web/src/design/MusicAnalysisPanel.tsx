import { useRef, useState } from 'react'
import type { MusicFeatures } from '@aura-spec/design-bridge'
import { architectureFromMusic } from '@aura-spec/design-bridge'
import { analyzeAudioFile, analyzeLiveInput } from '../audio/featureCapture'
import { useStudioStore } from '../state/store'

export function MusicAnalysisPanel() {
  const features = useStudioStore((state) => state.musicFeatures)
  const site = useStudioStore((state) => state.site)
  const status = useStudioStore((state) => state.analysisStatus)
  const setFeatures = useStudioStore((state) => state.setMusicFeatures)
  const setStatus = useStudioStore((state) => state.setAnalysisStatus)
  const apply = useStudioStore((state) => state.applyArchitectureIntent)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const run = async (operation: () => Promise<MusicFeatures>, label: string): Promise<void> => {
    setBusy(true)
    setStatus(`${label}…`)
    try {
      const next = await operation()
      setFeatures(next)
      setStatus(`${label} complete. ${next.warnings[0] ?? 'Features are ready for the design pass.'}`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  const generate = (): void => {
    if (!features) return
    const intent = architectureFromMusic(features, site)
    apply(intent)
    setStatus(`Architectural intent generated: ${intent.footprint.widthM} × ${intent.footprint.depthM} m, ${intent.speakers.length} speakers.`)
  }

  const edit = <K extends keyof MusicFeatures>(key: K, value: MusicFeatures[K]): void => {
    if (!features) return
    setFeatures({ ...features, [key]: value, source: 'manual' })
  }

  return (
    <section className="music-panel">
      <h2>Music → Space</h2>
      <p className="muted small">
        Analyze a prerecorded file or capture 5 seconds of live input. The features become an editable architectural intent.
      </p>
      <input
        ref={fileRef}
        type="file"
        accept="audio/*"
        className="file-input"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void run(() => analyzeAudioFile(file), `Analyzing ${file.name}`)
        }}
      />
      <div className="button-row">
        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()}>Analyze file</button>
        <button type="button" disabled={busy} onClick={() => void run(() => analyzeLiveInput(5), 'Listening live')}>Listen 5 s</button>
      </div>
      <p className="import-status">{status}</p>

      {features ? (
        <>
          <div className="feature-grid">
            <Feature label="Tempo" value={`${features.tempoBpm.toFixed(1)} BPM`} confidence={features.confidence.tempo} />
            <Feature label="Key" value={`${features.tonicPc} ${features.mode}`} confidence={features.confidence.key} />
            <Feature label="Density" value={features.density.toFixed(2)} />
            <Feature label="Brightness" value={features.brightness.toFixed(2)} />
            <Feature label="Roughness" value={features.roughness.toFixed(2)} />
            <Feature label="Dynamics" value={`${features.dynamicRangeDb.toFixed(1)} dB`} />
            <Feature label="Centroid" value={`${Math.round(features.spectralCentroidHz)} Hz`} />
            <Feature label="Onsets" value={`${features.onsetDensityPerSec.toFixed(1)}/s`} />
          </div>
          <div className="manual-grid">
            <Slider label="Tempo" min={40} max={180} step={1} value={features.tempoBpm} onChange={(value) => edit('tempoBpm', value)} />
            <Slider label="Density" min={0} max={1} step={0.01} value={features.density} onChange={(value) => edit('density', value)} />
            <Slider label="Brightness" min={0} max={1} step={0.01} value={features.brightness} onChange={(value) => edit('brightness', value)} />
            <Slider label="Roughness" min={0} max={1} step={0.01} value={features.roughness} onChange={(value) => edit('roughness', value)} />
          </div>
          <button type="button" className="primary wide-button" onClick={generate}>
            Generate architecture from music
          </button>
          <p className="muted small">
            Source: {features.source} · {features.warnings[0] ?? 'No warnings'}
          </p>
        </>
      ) : null}
    </section>
  )
}

function Feature({ label, value, confidence }: { label: string; value: string; confidence?: number }) {
  return (
    <div className="feature">
      <span>{label}</span>
      <strong>{value}</strong>
      {confidence !== undefined ? (
        <small className={`confidence${confidence < 0.2 ? ' low' : ''}`}>{Math.round(confidence * 100)}%</small>
      ) : null}
    </div>
  )
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="slider-field">
      <span>{label} <strong>{value.toFixed(2)}</strong></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  )
}
