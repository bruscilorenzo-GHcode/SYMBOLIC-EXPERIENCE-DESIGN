import { soundscapeFromArchitecture } from '@aura-spec/design-bridge'
import { descriptorLabel } from '@aura-spec/landscape-culture'
import { useStudioStore } from '../state/store'

export function SoundscapePanel() {
  const environment = useStudioStore((state) => state.environment)
  const session = useStudioStore((state) => state.session)
  const plan = useStudioStore((state) => state.soundscapePlan)
  const preview = useStudioStore((state) => state.previewSoundscapePlan)
  const apply = useStudioStore((state) => state.applySoundscapePlan)
  const setStatus = useStudioStore((state) => state.setAnalysisStatus)

  const analyze = (): void => {
    const next = soundscapeFromArchitecture(environment, session)
    preview(next)
    setStatus(`Soundscape proposed: ${next.metrics.zoneCount} zones, ${next.metrics.speakerCount} speakers, T60 ${next.metrics.t60S} s.`)
  }

  return (
    <section className="soundscape-panel">
      <h2>Space → Music</h2>
      <p className="muted small">
        Read the current geometry, materials and speaker layout, then derive a coherent multichannel soundscape.
      </p>
      <div className="button-row">
        <button type="button" className="primary" onClick={analyze}>Analyze architecture</button>
        <button type="button" disabled={!plan} onClick={() => plan && apply(plan)}>Apply soundscape</button>
      </div>

      {plan ? (
        <>
          <div className="plan-summary">
            <strong>{descriptorLabel(plan.globalDescriptor)}</strong>
            <span>{plan.spatialization.toUpperCase()} · {plan.sources.length} sources</span>
          </div>
          <div className="metric-grid">
            <Metric label="Volume" value={`${plan.metrics.volumeM3} m³`} />
            <Metric label="Surface" value={`${plan.metrics.surfaceAreaM2} m²`} />
            <Metric label="T60" value={`${plan.metrics.t60S} s`} />
            <Metric label="Glass" value={`${(plan.metrics.glassRatio * 100).toFixed(0)}%`} />
            <Metric label="Hard" value={`${(plan.metrics.hardRatio * 100).toFixed(0)}%`} />
            <Metric label="Soft" value={`${(plan.metrics.softRatio * 100).toFixed(0)}%`} />
          </div>
          <ul className="rationale-list">
            {plan.rationale.map((item) => <li key={item}>{item}</li>)}
          </ul>
          {plan.warnings.length > 0 ? (
            <p className="import-warning">{plan.warnings.join(' ')}</p>
          ) : null}
          <div className="zone-soundscapes">
            {plan.zones.map((zone) => (
              <div key={zone.zoneId}>
                <strong>{zone.name}</strong>
                <small>{descriptorLabel(zone.descriptor)} · ch {zone.channelStart + 1}–{zone.channelStart + zone.channelCount}</small>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="muted small">No soundscape proposal yet.</p>
      )}
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
