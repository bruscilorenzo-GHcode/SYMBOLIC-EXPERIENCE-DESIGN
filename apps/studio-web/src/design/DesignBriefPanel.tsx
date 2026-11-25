import { useStudioStore } from '../state/store'

export function DesignBriefPanel() {
  const intent = useStudioStore((state) => state.architectureIntent)
  const items = useStudioStore((state) => state.designItems)
  const drawing = useStudioStore((state) => state.importedDrawing)
  const site = useStudioStore((state) => state.site)

  return (
    <section className="brief-panel">
      <h2>Design brief</h2>
      <div className="facts">
        <div><dt>Site</dt><dd>{site.siteKind} · {site.widthM} × {site.depthM} m</dd></div>
        <div><dt>Items</dt><dd>{items.length}</dd></div>
        <div><dt>Drawing</dt><dd>{drawing ? `${drawing.fileName} · ${drawing.entities.length} entities` : 'none'}</dd></div>
        {intent ? <div><dt>Footprint</dt><dd>{intent.footprint.widthM} × {intent.footprint.depthM} m</dd></div> : null}
        {intent ? <div><dt>Ceiling</dt><dd>{intent.ceilingHeightM} m</dd></div> : null}
        {intent ? <div><dt>Speakers</dt><dd>{intent.speakers.length}</dd></div> : null}
        {intent ? <div><dt>Zones</dt><dd>{intent.zones.length}</dd></div> : null}
      </div>

      {intent ? (
        <>
          <div className="planting-summary">
            {intent.planting.map((entry) => (
              <span key={entry.stratum}>{entry.stratum}: {entry.quantity}</span>
            ))}
          </div>
          <ul className="rationale-list">
            {intent.rationale.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <div className="acoustic-targets">
            <span>T60 {intent.acoustics.targetT60S} s</span>
            <span>D/R {intent.acoustics.targetDirectToReverberantDb} dB</span>
            <span>±{intent.acoustics.targetUniformityDb} dB</span>
          </div>
        </>
      ) : (
        <p className="muted small">
          No generated architecture yet. Choose an approach, analyze music or architecture, then generate the intent.
        </p>
      )}
    </section>
  )
}
