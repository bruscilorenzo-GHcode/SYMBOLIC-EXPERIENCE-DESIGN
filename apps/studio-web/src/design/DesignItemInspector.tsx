import type { ArchitecturalItemSpec } from '@aura-spec/design-bridge'
import { DESIGN_MATERIALS } from './materials'
import { useStudioStore } from '../state/store'

export function DesignItemInspector() {
  const selectedId = useStudioStore((state) => state.selectedDesignItemId)
  const item = useStudioStore((state) => state.designItems.find((candidate) => candidate.id === selectedId))
  const updateItem = useStudioStore((state) => state.updateDesignItem)
  const removeItem = useStudioStore((state) => state.removeDesignItem)

  if (!item) {
    return (
      <section className="empty-inspector">
        <h2>Selected item</h2>
        <p className="muted small">Select an architectural item on the plan to edit its dimensions, material and elevation.</p>
      </section>
    )
  }

  const update = <K extends keyof ArchitecturalItemSpec>(key: K, value: ArchitecturalItemSpec[K]): void => {
    updateItem(item.id, { [key]: value } as Pick<ArchitecturalItemSpec, K>)
  }

  return (
    <section>
      <h2>{item.label}</h2>
      <p className="muted small">{item.kind} · editable architectural item</p>
      <div className="site-grid">
        <label className="design-field span-2">
          <span>Label</span>
          <input value={item.label} onChange={(event) => update('label', event.target.value)} />
        </label>
        <NumberField label="X m" value={item.xM} step={0.1} onChange={(value) => update('xM', value)} />
        <NumberField label="Z m" value={item.zM} step={0.1} onChange={(value) => update('zM', value)} />
        <NumberField label="Width m" value={item.widthM} step={0.1} onChange={(value) => update('widthM', Math.max(0.05, value))} />
        <NumberField label="Depth m" value={item.depthM} step={0.1} onChange={(value) => update('depthM', Math.max(0.05, value))} />
        <NumberField label="Height m" value={item.heightM} step={0.1} onChange={(value) => update('heightM', Math.max(0.02, value))} />
        <NumberField label="Base m" value={item.baseHeightM} step={0.1} onChange={(value) => update('baseHeightM', value)} />
        <NumberField label="Rotation°" value={item.rotationDeg} step={1} onChange={(value) => update('rotationDeg', value)} />
        <label className="design-field">
          <span>Material</span>
          <select value={item.materialId} onChange={(event) => update('materialId', event.target.value)}>
            {DESIGN_MATERIALS.map((material) => (
              <option key={material.id} value={material.id}>{material.name}</option>
            ))}
          </select>
        </label>
      </div>
      <button type="button" className="danger wide-button" onClick={() => removeItem(item.id)}>Remove item</button>
    </section>
  )
}

function NumberField({
  label,
  value,
  step,
  onChange,
}: {
  label: string
  value: number
  step: number
  onChange: (value: number) => void
}) {
  return (
    <label className="design-field">
      <span>{label}</span>
      <input
        type="number"
        step={step}
        value={Number(value.toFixed(2))}
        onChange={(event) => {
          const parsed = Number(event.target.value)
          if (Number.isFinite(parsed)) onChange(parsed)
        }}
      />
    </label>
  )
}
