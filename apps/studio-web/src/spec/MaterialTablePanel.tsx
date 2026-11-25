import { useMemo } from 'react'
import type { ArchitecturalEnvironment } from '@aura-spec/core-acoustics'
import { OCTAVE_BANDS_HZ } from '@aura-spec/core-acoustics'

export function MaterialTablePanel({ environment }: { environment: ArchitecturalEnvironment }) {
  const bands = useMemo(() => [...OCTAVE_BANDS_HZ], [])
  const usedIds = useMemo(
    () => new Set(environment.surfaces.map((surface) => surface.materialId)),
    [environment.surfaces],
  )
  const materials = useMemo(
    () => environment.materials.filter((material) => usedIds.has(material.id)),
    [environment.materials, usedIds],
  )
  const visibleMaterials = materials.length > 0 ? materials : environment.materials
  if (visibleMaterials.length === 0) {
    return <p className="muted small">No materials in this environment yet.</p>
  }

  return (
    <section className="spec-table-section">
      <h2>Boundary materials · absorption & scattering</h2>
      <p className="muted small">
        Octave-band coefficients used by the Sabine/Eyring estimates and the coverage model. Illustrative until measured.
      </p>
      <div className="spec-table-scroll">
        <table className="spec-table">
          <thead>
            <tr>
              <th>Material</th>
              <th>Category</th>
              {bands.map((band) => (
                <th key={band}>{band >= 1000 ? `${band / 1000}k` : band}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleMaterials.flatMap((material) => {
              const absorptionRow = (
                <tr key={`${material.id}-absorption`}>
                  <td rowSpan={2}>
                    <strong>{material.name}</strong>
                    <small>{material.id}</small>
                  </td>
                  <td rowSpan={2}>{material.category}</td>
                  {bands.map((_, index) => (
                    <td key={index}>{(material.absorption.values[index] ?? 0).toFixed(2)}</td>
                  ))}
                </tr>
              )
              const scatteringRow = (
                <tr key={`${material.id}-scattering`} className="scattering-row">
                  {bands.map((_, index) => (
                    <td key={index}>{(material.scattering.values[index] ?? 0).toFixed(2)}</td>
                  ))}
                </tr>
              )
              return [absorptionRow, scatteringRow]
            })}
          </tbody>
        </table>
      </div>
      <p className="muted small">Upper row: absorption α · lower row: scattering. Octave bands 63 Hz–16 kHz.</p>
    </section>
  )
}
