import type { SiteContext } from '@aura-spec/design-bridge'
import { useStudioStore } from '../state/store'

export function SitePanel() {
  const site = useStudioStore((state) => state.site)
  const setSite = useStudioStore((state) => state.setSite)

  const update = <K extends keyof SiteContext>(key: K, value: SiteContext[K]): void => {
    setSite({ [key]: value } as Pick<SiteContext, K>)
  }

  return (
    <section>
      <h2>Site context</h2>
      <div className="site-grid">
        <label className="design-field">
          <span>Site</span>
          <select value={site.siteKind} onChange={(event) => update('siteKind', event.target.value as SiteContext['siteKind'])}>
            <option value="indoor">Indoor</option>
            <option value="outdoor">Outdoor</option>
            <option value="phygital">Phygital</option>
          </select>
        </label>
        <label className="design-field">
          <span>Climate</span>
          <select value={site.climate} onChange={(event) => update('climate', event.target.value as SiteContext['climate'])}>
            <option value="mediterranean">Mediterranean</option>
            <option value="temperate">Temperate</option>
            <option value="cold">Cold</option>
            <option value="tropical">Tropical</option>
          </select>
        </label>
        <NumberField label="Width m" value={site.widthM} step={1} onChange={(value) => update('widthM', value)} />
        <NumberField label="Depth m" value={site.depthM} step={1} onChange={(value) => update('depthM', value)} />
        <NumberField label="Ceiling m" value={site.ceilingHeightM} step={0.5} onChange={(value) => update('ceilingHeightM', value)} />
        <NumberField label="Daylight 0–1" value={site.daylight} step={0.05} onChange={(value) => update('daylight', Math.min(1, Math.max(0, value)))} />
        <label className="design-field span-2">
          <span>Acoustic intent</span>
          <select value={site.acousticIntent} onChange={(event) => update('acousticIntent', event.target.value as SiteContext['acousticIntent'])}>
            <option value="intimate">Intimate</option>
            <option value="immersive">Immersive</option>
            <option value="public">Public</option>
            <option value="contemplative">Contemplative</option>
          </select>
        </label>
      </div>
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
