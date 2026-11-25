import type { BandSeries, SurfaceMaterial } from '@aura-spec/core-acoustics'
import { OCTAVE_BANDS_HZ } from '@aura-spec/core-acoustics'

const BANDS = [...OCTAVE_BANDS_HZ]

function series(values: number[]): BandSeries {
  return { frequenciesHz: [...BANDS], values }
}

export const DESIGN_MATERIALS: SurfaceMaterial[] = [
  {
    id: 'design-stone',
    name: 'Stone paving',
    category: 'concrete',
    absorption: series([0.01, 0.01, 0.02, 0.02, 0.03, 0.04, 0.05, 0.06, 0.06]),
    scattering: series([0.08, 0.08, 0.1, 0.12, 0.15, 0.18, 0.2, 0.22, 0.22]),
    notes: 'Illustrative material for the design studio.',
  },
  {
    id: 'design-concrete',
    name: 'Board-formed concrete',
    category: 'concrete',
    absorption: series([0.01, 0.01, 0.02, 0.02, 0.03, 0.03, 0.04, 0.05, 0.05]),
    scattering: series([0.05, 0.05, 0.06, 0.07, 0.08, 0.09, 0.1, 0.12, 0.12]),
  },
  {
    id: 'design-glass',
    name: 'Laminated glass',
    category: 'glass',
    absorption: series([0.03, 0.03, 0.02, 0.02, 0.02, 0.02, 0.03, 0.03, 0.03]),
    scattering: series([0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02]),
    transmissionLossDb: series([22, 25, 28, 31, 34, 37, 40, 43, 45]),
  },
  {
    id: 'design-wood',
    name: 'Timber lining',
    category: 'wood',
    absorption: series([0.05, 0.06, 0.07, 0.08, 0.09, 0.1, 0.11, 0.12, 0.12]),
    scattering: series([0.1, 0.11, 0.12, 0.14, 0.16, 0.18, 0.2, 0.22, 0.22]),
  },
  {
    id: 'design-water',
    name: 'Water surface',
    category: 'water',
    absorption: series([0.01, 0.01, 0.02, 0.02, 0.03, 0.04, 0.05, 0.05, 0.05]),
    scattering: series([0.02, 0.02, 0.03, 0.03, 0.04, 0.05, 0.06, 0.06, 0.06]),
  },
  {
    id: 'design-planting',
    name: 'Planting substrate',
    category: 'vegetation',
    absorption: series([0.08, 0.12, 0.18, 0.22, 0.28, 0.32, 0.35, 0.38, 0.38]),
    scattering: series([0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.5]),
  },
  {
    id: 'design-metal',
    name: 'Perforated metal',
    category: 'metal',
    absorption: series([0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.09]),
    scattering: series([0.05, 0.06, 0.08, 0.1, 0.12, 0.14, 0.16, 0.18, 0.18]),
  },
  {
    id: 'design-fabric',
    name: 'Acoustic fabric',
    category: 'fabric',
    absorption: series([0.1, 0.15, 0.25, 0.4, 0.55, 0.6, 0.6, 0.6, 0.6]),
    scattering: series([0.08, 0.1, 0.12, 0.14, 0.16, 0.18, 0.2, 0.2, 0.2]),
  },
]

export function designMaterial(id: string): SurfaceMaterial {
  return DESIGN_MATERIALS.find((material) => material.id === id) ?? DESIGN_MATERIALS[0]!
}
