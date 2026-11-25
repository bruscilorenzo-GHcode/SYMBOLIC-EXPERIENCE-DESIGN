import type {
  ArchitecturalItemSpec,
  ArchitectureIntent,
  DesignZoneSpec,
  MusicFeatures,
  PlantingIntent,
  SiteContext,
  SpeakerIntent,
} from './types'
import { clamp, clamp01 } from './types'

export const DESIGN_MATERIAL_IDS = {
  stone: 'design-stone',
  concrete: 'design-concrete',
  glass: 'design-glass',
  wood: 'design-wood',
  water: 'design-water',
  planting: 'design-planting',
  metal: 'design-metal',
  fabric: 'design-fabric',
} as const

/**
 * Music-first design pass.
 *
 * The mapping is deliberately legible:
 * - tempo → module/footprint and circulation rhythm
 * - density/onsets → zone count and speaker count
 * - brightness/high energy → glass, openings, canopy height
 * - roughness/flatness → scattering surfaces, stone, planting mass
 * - dynamic range/low energy → ceiling height, refuge, bass support
 *
 * It produces an editable intent; it does not silently commit geometry.
 */
export function architectureFromMusic(
  features: MusicFeatures,
  site: SiteContext,
): ArchitectureIntent {
  const tempo = clamp(features.tempoBpm, 40, 200)
  const density = clamp01(features.density)
  const brightness = clamp01(features.brightness)
  const roughness = clamp01(features.roughness)
  const dynamic = clamp(features.dynamicRangeDb, 0, 60)
  const low = clamp01(features.lowEnergyRatio)
  const onsets = Math.max(0, features.onsetDensityPerSec)
  const area = Math.max(16, site.widthM * site.depthM)

  const moduleM = clamp(2.4 + tempo / 40 + density * 4, 4, 16)
  const widthM = clamp(Math.min(site.widthM, moduleM * 2.4 + density * 6), 6, site.widthM)
  const depthM = clamp(Math.min(site.depthM, moduleM * 1.7 + roughness * 5), 5, site.depthM)
  const baseCeiling = site.siteKind === 'outdoor' ? 3.2 + brightness * 3 + dynamic / 30 : site.ceilingHeightM
  const ceilingHeightM = clamp(baseCeiling + (dynamic / 60) * 2.4, 2.8, 18)

  const items: ArchitecturalItemSpec[] = []
  const zones: DesignZoneSpec[] = []
  let itemIndex = 0
  const add = (
    kind: ArchitecturalItemSpec['kind'],
    label: string,
    xM: number,
    zM: number,
    width: number,
    depth: number,
    height: number,
    baseHeight: number,
    rotationDeg: number,
    materialId: string,
    color: string,
  ): void => {
    itemIndex += 1
    items.push({
      id: `item-${kind}-${itemIndex}`,
      kind,
      label,
      xM,
      zM,
      widthM: width,
      depthM: depth,
      heightM: height,
      baseHeightM: baseHeight,
      rotationDeg,
      materialId,
      color,
    })
  }

  add('floor', 'Primary floor', 0, 0, widthM, depthM, 0.12, 0, 0, DESIGN_MATERIAL_IDS.stone, '#767b74')
  add('wall', 'North wall', 0, -depthM / 2, widthM, 0.25, ceilingHeightM, 0, 0, DESIGN_MATERIAL_IDS.concrete, '#8d8f89')
  add('wall', 'West wall', -widthM / 2, 0, 0.25, depthM, ceilingHeightM, 0, 0, DESIGN_MATERIAL_IDS.concrete, '#8d8f89')
  add('glass', 'East glass façade', widthM / 2, 0, 0.2, depthM * 0.75, ceilingHeightM * (0.45 + brightness * 0.45), 0, 0, DESIGN_MATERIAL_IDS.glass, '#9fd6e8')
  if (brightness > 0.45) {
    add('opening', 'South opening', 0, depthM / 2, widthM * (0.18 + brightness * 0.2), 0.2, ceilingHeightM * 0.7, 0, 0, DESIGN_MATERIAL_IDS.glass, '#c9edf4')
  } else {
    add('wall', 'South wall', 0, depthM / 2, widthM, 0.25, ceilingHeightM, 0, 0, DESIGN_MATERIAL_IDS.concrete, '#8d8f89')
  }

  if (site.siteKind !== 'indoor') {
    add('canopy', 'Canopy', 0, -depthM * 0.16, widthM * 0.55, depthM * 0.36, 0.18, ceilingHeightM * 0.8, 0, DESIGN_MATERIAL_IDS.wood, '#a88c68')
  }

  add('stage', 'Performance platform', 0, -depthM * 0.18, Math.min(5.4, widthM * 0.28), Math.min(3.4, depthM * 0.25), 0.42, 0, 0, DESIGN_MATERIAL_IDS.wood, '#9b7a57')
  add('path', 'Arrival path', 0, depthM * 0.28, Math.min(2.2, widthM * 0.12), depthM * 0.42, 0.04, 0, 0, DESIGN_MATERIAL_IDS.stone, '#a2a49d')

  const planterCount = density > 0.55 ? 2 : 1
  for (let index = 0; index < planterCount; index += 1) {
    const side = index === 0 ? -1 : 1
    add(
      'planter',
      `Planting bed ${index + 1}`,
      side * (widthM * 0.32),
      depthM * 0.18,
      widthM * 0.18,
      depthM * 0.2,
      0.45,
      0,
      0,
      DESIGN_MATERIAL_IDS.planting,
      '#6f8b61',
    )
  }

  if (brightness > 0.55 || low > 0.6) {
    add('water', 'Water mirror', widthM * 0.24, depthM * 0.28, widthM * 0.18, depthM * 0.18, 0.06, 0, 0, DESIGN_MATERIAL_IDS.water, '#4e8fa8')
  }

  if (roughness > 0.5) {
    add('column', 'Acoustic column 1', -widthM * 0.28, -depthM * 0.1, 0.45, 0.45, ceilingHeightM, 0, 0, DESIGN_MATERIAL_IDS.concrete, '#7a7d77')
    add('column', 'Acoustic column 2', widthM * 0.28, -depthM * 0.1, 0.45, 0.45, ceilingHeightM, 0, 0, DESIGN_MATERIAL_IDS.concrete, '#7a7d77')
  }

  zones.push(
    {
      id: 'zone-threshold',
      name: 'Threshold',
      kind: 'threshold',
      xM: 0,
      zM: depthM * 0.34,
      widthM: widthM * 0.55,
      depthM: depthM * 0.24,
      ceilingHeightM: ceilingHeightM * 0.65,
      exposure: site.siteKind === 'indoor' ? 'indoor' : 'outdoor',
    },
    {
      id: 'zone-core',
      name: 'Core listening field',
      kind: 'core',
      xM: 0,
      zM: 0,
      widthM: widthM * 0.5,
      depthM: depthM * 0.4,
      ceilingHeightM,
      exposure: site.siteKind === 'indoor' ? 'indoor' : site.siteKind === 'phygital' ? 'sheltered' : 'outdoor',
    },
    {
      id: 'zone-refuge',
      name: 'Refuge',
      kind: 'refuge',
      xM: -widthM * 0.3,
      zM: depthM * 0.18,
      widthM: widthM * 0.22,
      depthM: depthM * 0.22,
      ceilingHeightM: ceilingHeightM * 0.55,
      exposure: site.siteKind === 'outdoor' ? 'sheltered' : 'indoor',
    },
  )

  if (site.siteKind !== 'indoor') {
    zones.push({
      id: 'zone-canopy',
      name: 'Canopy edge',
      kind: 'canopy',
      xM: 0,
      zM: -depthM * 0.16,
      widthM: widthM * 0.55,
      depthM: depthM * 0.36,
      ceilingHeightM: ceilingHeightM * 0.8,
      exposure: 'sheltered',
    })
  }
  if (items.some((item) => item.kind === 'water')) {
    zones.push({
      id: 'zone-water-edge',
      name: 'Water edge',
      kind: 'water-edge',
      xM: widthM * 0.24,
      zM: depthM * 0.28,
      widthM: widthM * 0.2,
      depthM: depthM * 0.2,
      ceilingHeightM: ceilingHeightM * 0.5,
      exposure: 'outdoor',
    })
  }

  const speakerCount = clamp(Math.round(4 + density * 4 + Math.min(2, onsets / 3)), 4, 10)
  const speakers: SpeakerIntent[] = []
  const speakerHeight = site.siteKind === 'indoor' ? ceilingHeightM * 0.72 : 3.1
  for (let index = 0; index < speakerCount; index += 1) {
    const angle = (index / speakerCount) * Math.PI * 2 - Math.PI / 2
    const radiusX = widthM * 0.4
    const radiusZ = depthM * 0.38
    const xM = Math.cos(angle) * radiusX
    const zM = Math.sin(angle) * radiusZ
    const yawDeg = (Math.atan2(-xM, -zM) * 180) / Math.PI
    speakers.push({
      id: `speaker-${index + 1}`,
      profileId:
        site.siteKind === 'indoor' || density > 0.65
          ? 'karray-reference-line-8'
          : 'as-reference-omni-01',
      label: `Speaker ${index + 1}`,
      xM: Math.round(xM * 10) / 10,
      yM: Math.round(speakerHeight * 10) / 10,
      zM: Math.round(zM * 10) / 10,
      yawDeg: Math.round(yawDeg * 10) / 10,
      gainDb: -6,
      delayMs: 0,
      zoneId: index % 3 === 0 ? 'zone-core' : index % 3 === 1 ? 'zone-threshold' : 'zone-refuge',
    })
  }

  const plantScale = clamp01(0.35 + roughness * 0.65)
  const planting: PlantingIntent[] = [
    {
      stratum: 'ground-cover',
      quantity: Math.max(12, Math.round(area * 0.16 * plantScale)),
      rationale: 'Fine-grained ground texture and low-level absorption.',
    },
    {
      stratum: 'shrub',
      quantity: Math.max(4, Math.round(area * 0.025 * plantScale)),
      rationale: 'Mid-layer masking and seasonal acoustic change.',
    },
    {
      stratum: 'small-tree',
      quantity: Math.max(1, Math.round(area * 0.008 * plantScale)),
      rationale: 'Understorey scale and near-listener canopy.',
    },
    {
      stratum: 'medium-tree',
      quantity: Math.max(1, Math.round(area * 0.004 * plantScale)),
      rationale: 'Structural middle layer and wind filtering.',
    },
    {
      stratum: 'large-tree',
      quantity: Math.max(1, Math.round(area * 0.002 * plantScale)),
      rationale: 'Canopy roof and long reverberation shadow.',
    },
  ]

  return {
    site,
    footprint: { widthM: Math.round(widthM * 10) / 10, depthM: Math.round(depthM * 10) / 10 },
    ceilingHeightM: Math.round(ceilingHeightM * 10) / 10,
    items,
    zones,
    speakers,
    planting,
    acoustics: {
      targetT60S: Math.round((site.siteKind === 'indoor' ? 0.6 + brightness * 1.1 : 0.8 + density * 0.8) * 10) / 10,
      targetDirectToReverberantDb: Math.round((5 + brightness * 8) * 10) / 10,
      targetUniformityDb: Math.round((3 + roughness * 2) * 10) / 10,
    },
    rationale: [
      `Tempo ${tempo.toFixed(0)} BPM → ${widthM.toFixed(1)} × ${depthM.toFixed(1)} m footprint and ${zones.length} zones.`,
      `Density ${density.toFixed(2)} → ${speakerCount} speakers and ${planterCount} planting beds.`,
      `Brightness ${brightness.toFixed(2)} → glass façade and ${brightness > 0.45 ? 'open' : 'closed'} south edge.`,
      `Roughness ${roughness.toFixed(2)} → stone/concrete scattering, columns and planting mass.`,
      `Dynamic range ${dynamic.toFixed(1)} dB → ${ceilingHeightM.toFixed(1)} m ceiling/canopy height.`,
      `Low-frequency energy ${low.toFixed(2)} → ${low > 0.6 ? 'water mirror and bass-capable layout' : 'lightweight acoustic footprint'}.`,
    ],
  }
}
