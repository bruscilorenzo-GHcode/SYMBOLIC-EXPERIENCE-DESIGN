import { useMemo } from 'react'
import type { AcousticSpeakerProfile, SpatialAudioSession } from '@aura-spec/core-acoustics'
import { computeBom, type BomResult } from '@aura-spec/core-acoustics'

export function BomPanel({
  session,
  profiles,
}: {
  session: SpatialAudioSession
  profiles: AcousticSpeakerProfile[]
}) {
  const result = useMemo<BomResult>(
    () => computeBom(session, profiles, { headroomDb: 10, voltageMode: 'low-z', cableRunM: 15 }),
    [session, profiles],
  )

  return (
    <section className="spec-table-section">
      <h2>BOM · amplification · network</h2>
      <p className="muted small">
        First-order engineering projection of the current placements. Low-Z sizing with 10 dB headroom; network budget
        uses the Dante/AES67 payload model.
      </p>

      <div className="metric-grid">
        <div className="metric"><span>Speakers</span><strong>{result.totals.speakerCount}</strong></div>
        <div className="metric"><span>Subs</span><strong>{result.totals.subwooferCount}</strong></div>
        <div className="metric"><span>RMS load</span><strong>{result.totals.rmsPowerW} W</strong></div>
        <div className="metric"><span>Amp allowance</span><strong>{result.totals.amplifierPowerW} W</strong></div>
        <div className="metric"><span>Cable</span><strong>{result.totals.cableLengthM} m</strong></div>
        <div className="metric"><span>Dante ch</span><strong>{result.totals.network.channels}</strong></div>
      </div>

      <div className="spec-table-scroll">
        <table className="spec-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Category</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.description}</strong>
                  {item.sku ? <small>{item.sku}</small> : null}
                </td>
                <td>{item.category}</td>
                <td>{item.quantity}</td>
                <td>{item.unit}</td>
                <td className="bom-notes">{item.notes ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="network-summary">
        <span>Network: {result.totals.network.budgetedMbps} Mbps budget · {result.totals.network.recommendedSwitchGbps} Gbps switch</span>
        <span>Latency budget: {result.totals.network.latencyBudgetMs} ms / target {result.totals.network.latencyTargetMs} ms</span>
      </div>

      {result.warnings.length > 0 ? (
        <ul className="rationale-list">
          {result.warnings.map((warning) => <li key={warning}>{warning}</li>)}
        </ul>
      ) : null}
      <p className="muted small">{result.assumptions[0]}</p>
    </section>
  )
}
