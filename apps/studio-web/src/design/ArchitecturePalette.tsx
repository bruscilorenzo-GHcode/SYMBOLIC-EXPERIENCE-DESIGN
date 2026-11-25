import type { ArchitecturalItemKind } from '@aura-spec/design-bridge'
import { useStudioStore } from '../state/store'

const ITEMS: { kind: ArchitecturalItemKind; label: string; color: string; hint: string }[] = [
  { kind: 'floor', label: 'Floor', color: '#8d8f89', hint: 'Primary surface' },
  { kind: 'wall', label: 'Wall', color: '#b6b7b1', hint: 'Reflective boundary' },
  { kind: 'glass', label: 'Glass', color: '#9fd6e8', hint: 'Transparent façade' },
  { kind: 'opening', label: 'Opening', color: '#c9edf4', hint: 'Threshold / void' },
  { kind: 'canopy', label: 'Canopy', color: '#a88c68', hint: 'Overhead shelter' },
  { kind: 'planter', label: 'Planter', color: '#6f8b61', hint: 'Vegetation mass' },
  { kind: 'water', label: 'Water', color: '#4e8fa8', hint: 'Reflective / fluid' },
  { kind: 'stage', label: 'Stage', color: '#9b7a57', hint: 'Performance platform' },
  { kind: 'path', label: 'Path', color: '#a2a49d', hint: 'Circulation' },
  { kind: 'column', label: 'Column', color: '#7a7d77', hint: 'Scattering / structure' },
]

export function ArchitecturePalette() {
  const active = useStudioStore((state) => state.activeDesignTool)
  const setActive = useStudioStore((state) => state.setActiveDesignTool)

  return (
    <section>
      <h2>Architectural items</h2>
      <p className="muted small">Choose an item, then click the plan to place it. Drag items to move.</p>
      <div className="palette-grid">
        {ITEMS.map((item) => (
          <button
            key={item.kind}
            type="button"
            className={`palette-button${active === item.kind ? ' is-active' : ''}`}
            onClick={() => setActive(active === item.kind ? null : item.kind)}
            title={item.hint}
          >
            <span className="palette-swatch" style={{ background: item.color }} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      {active ? (
        <div className="placement-hint">
          Placing <strong>{active}</strong> · click the plan. <button type="button" onClick={() => setActive(null)}>Cancel</button>
        </div>
      ) : null}
    </section>
  )
}
