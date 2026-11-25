import { useMemo } from 'react'
import {
  GIARDINO_SONORO_DEMO,
  PLANT_CATALOG,
  REQUIRED_FOLIAGE,
  REQUIRED_STRATA,
  auditLandscapeCulture,
  describeDataToMusic,
} from '@aura-spec/landscape-culture'

export function LandscapePanel() {
  const audit = useMemo(() => auditLandscapeCulture(GIARDINO_SONORO_DEMO), [])
  const palettes = Object.values(audit.palette)
  const strataTotals = REQUIRED_STRATA.map((stratum) => ({
    stratum,
    count: palettes.reduce((sum, palette) => sum + palette.totals.byStratum[stratum], 0),
  }))
  const foliageTotals = REQUIRED_FOLIAGE.map((size) => ({
    size,
    count: palettes.reduce((sum, palette) => sum + palette.totals.byFoliage[size], 0),
  }))
  const river = audit.dataToMusic.find((zone) => zone.zoneId === 'zone-river')
  const grove = audit.dataToMusic.find((zone) => zone.zoneId === 'zone-grove')

  return (
    <section className="landscape-panel">
      <h2>Landscape culture · Giardino Sonoro</h2>
      <p className="muted small">
        Vertical strata, foliage scale, wiring and DATA→MUSIC audit. Plants and acoustic values are
        illustrative.
      </p>

      <div className="strata-grid">
        {strataTotals.map((item) => (
          <div key={item.stratum}>
            <strong>{item.count}</strong>
            <span>{item.stratum.replace('-', ' ')}</span>
          </div>
        ))}
      </div>

      <div className="chip-row">
        {foliageTotals.map((item) => (
          <span key={item.size} className="chip">
            {item.size} foliage · {item.count}
          </span>
        ))}
      </div>

      <ul className="mini-list">
        {audit.wiring.map((plan) => (
          <li key={plan.zoneId}>
            <span>{plan.zoneId.replace('zone-', '')}</span>
            <strong>{plan.method.replace('wired-', '').replace('wireless-', '')}</strong>
            <small>{plan.channels.length} ch · {plan.latencyBudgetMs} ms</small>
          </li>
        ))}
      </ul>

      <div className="data-music">
        <h3>DATA → MUSIC</h3>
        {river ? (
          <p>
            <strong>River</strong>
            <small>{describeDataToMusic(river.result)}</small>
          </p>
        ) : null}
        {grove ? (
          <p>
            <strong>Grove air</strong>
            <small>{describeDataToMusic(grove.result)}</small>
          </p>
        ) : null}
      </div>

      <p className="muted small">
        Textual meta-composition: {audit.textual.draft.attribution.length} visitor texts →{' '}
        {audit.textual.draft.zones.length} zones · {audit.textual.issues.length} validation issues.
      </p>

      <details>
        <summary>Palette · {PLANT_CATALOG.length} species</summary>
        {REQUIRED_STRATA.map((stratum) => (
          <div key={stratum} className="species-group">
            <h3>{stratum.replace('-', ' ')}</h3>
            <ul>
              {PLANT_CATALOG.filter((profile) => profile.stratum === stratum).map((profile) => (
                <li key={profile.id}>
                  <em>{profile.botanicalName}</em>
                  <span>{profile.foliageSize} foliage</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </details>
    </section>
  )
}
