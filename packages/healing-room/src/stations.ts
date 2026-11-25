import type { StationKind, StationSpec } from './types'

/**
 * Station typologies from the PHAS brief. Shell forms are infinite and remain
 * a subject for the client's design teams; the engine only fixes the technical
 * families and their sensory capabilities.
 */
export const HEALING_STATIONS: StationSpec[] = [
  {
    kind: 'kiosk-4',
    label: '4 m² kiosk station',
    labelIt: 'Stazione kiosk 4 m²',
    areaSqm: 4,
    sphericalDisplay: true,
    soundShower: true,
    isolation: true,
    description:
      'Isolation tube, “analogue VR”: a spherical screen with a sound shower for a single visitor and a full-sense dialogue with the algorithmic system.',
    descriptionIt:
      'Tubo di isolamento, “VR analogica”: schermo sferico con doccia sonora per un singolo visitatore e dialogo a tutti i sensi con il sistema algoritmico.',
  },
  {
    kind: 'capsule-16',
    label: '16 m² capsule station',
    labelIt: 'Stazione capsula 16 m²',
    areaSqm: 16,
    sphericalDisplay: true,
    soundShower: true,
    isolation: true,
    description:
      'Diagnostic capsules for event installations: biomorphic deprivation shells and cosy bioshape armchairs around one concentrated thought.',
    descriptionIt:
      'Capsule diagnostiche per installazioni evento: gusci di deprivation biomorfici e poltrone bioshape accoglienti intorno a un solo pensiero concentrato.',
  },
  {
    kind: 'event-255',
    label: '255 m² event station',
    labelIt: 'Stazione evento 255 m²',
    areaSqm: 265.64,
    sphericalDisplay: false,
    soundShower: false,
    isolation: false,
    description:
      'The full architectural layer: observation space 151.52 m², four diagnostic spaces of about 18 m² and a 41.05 m² focus area — 265.64 m² measured.',
    descriptionIt:
      'Il layer architettonico completo: spazio di osservazione 151,52 m², quattro spazi diagnostici di circa 18 m² e area focus di 41,05 m² — 265,64 m² misurati.',
  },
]

export function stationByKind(kind: StationKind): StationSpec {
  const station = HEALING_STATIONS.find((item) => item.kind === kind)
  if (!station) throw new Error(`Unknown station kind: ${kind}`)
  return station
}
