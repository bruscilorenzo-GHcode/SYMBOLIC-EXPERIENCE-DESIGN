import type {
  ArchitecturalItemKind,
  ArchitecturalItemSpec,
  ArchitectureIntent,
  MusicFeatures,
  SiteContext,
  SpeakerIntent,
} from '@aura-spec/design-bridge'
import { architectureFromMusic } from '@aura-spec/design-bridge'
import { getPlayObjectCatalogItem, speakerPersonaOf } from './objects'
import { personaToSpeakerIntent } from '@aura-spec/inhabiting-model'
import type { PlayComposition, PlayObjectKind, PlayObjectSpec } from './types'

/**
 * Music features are deliberately legible: the Play descriptor can be fed
 * directly into the existing music-first design bridge. Play-specific
 * geometry then re-enters as authored architectural items, so the Spatial and
 * Design studios keep the same contracts they already understand.
 */
export function musicFeaturesFromPlay(composition: PlayComposition): MusicFeatures {
  const descriptor = composition.music.descriptor
  return {
    tempoBpm: descriptor.tempoBpm,
    tonicPc: descriptor.tonicPc,
    mode: ['ionian', 'lydian', 'mixolydian'].includes(descriptor.mode) ? 'major' : 'minor',
    density: descriptor.density,
    brightness: descriptor.brightness,
    roughness: descriptor.roughness,
    dynamicRangeDb: Math.min(36, 10 + composition.acoustics.t60S * 5),
    spectralCentroidHz: Math.round(380 + descriptor.brightness * 4200),
    lowEnergyRatio: Math.max(0, 1 - descriptor.brightness),
    highEnergyRatio: descriptor.brightness,
    onsetDensityPerSec: Math.round(descriptor.density * 48) / 10,
    durationS: 72,
    confidence: { tempo: 0.86, key: 0.74, spectral: 0.82 },
    source: 'manual',
    warnings: ['Play descriptor is an authored/estimated composition, not an analysed recording.'],
  }
}

const PLAY_OBJECT_ITEM_KIND: Record<PlayObjectKind, ArchitecturalItemKind> = {
  'tree-small': 'planter',
  'tree-medium': 'planter',
  'tree-large': 'planter',
  shrub: 'planter',
  'ground-cover': 'planter',
  water: 'water',
  path: 'path',
  canopy: 'canopy',
  bench: 'stage',
  stone: 'column',
  light: 'column',
  'room-volume': 'floor',
  table: 'stage',
  chair: 'stage',
  sofa: 'stage',
  window: 'glass',
  door: 'opening',
  wall: 'wall',
  column: 'column',
  rug: 'planter',
  curtain: 'planter',
  panel: 'planter',
  speaker: 'column',
}

function playObjectToItem(object: PlayObjectSpec): ArchitecturalItemSpec {
  return {
    id: `play-object-${object.id}`,
    kind: PLAY_OBJECT_ITEM_KIND[object.kind],
    label: object.label,
    xM: object.xM,
    zM: object.zM,
    widthM: object.widthM,
    depthM: object.depthM,
    heightM: object.heightM,
    baseHeightM: object.baseHeightM,
    rotationDeg: object.rotationDeg,
    materialId: object.materialId,
    color: object.color,
  }
}

function playObjectToSpeaker(object: PlayObjectSpec): SpeakerIntent {
  const persona = speakerPersonaOf(object)
  const intent = personaToSpeakerIntent(
    {
      id: object.id,
      personaId: persona.id,
      xM: object.xM,
      yM: object.baseHeightM + object.heightM * (persona.id === 'sub-sculpture' ? 0.35 : 0.7),
      zM: object.zM,
      yawDeg: object.rotationDeg,
      zoneId: object.zM < -2 ? 'zone-grove' : object.zM > 2 ? 'zone-clearing' : 'zone-river',
    },
    [persona],
  )
  return { ...intent, id: `play-speaker-${object.id}`, label: persona.name }
}

export function buildArchitectureIntentFromPlay(
  composition: PlayComposition,
  baseSite: SiteContext,
  playObjects: readonly PlayObjectSpec[] = [],
): ArchitectureIntent {
  const { parameters, geometry, music, vegetation, acoustics, social } = composition
  const site: SiteContext = {
    ...baseSite,
    siteKind: 'outdoor',
    daylight: parameters.light,
    ceilingHeightM: Math.max(3.2, geometry.canopyHeightM),
    acousticIntent:
      parameters.canopy > 0.62
        ? 'intimate'
        : parameters.guests > 0.62
          ? 'public'
          : parameters.light < 0.3
            ? 'contemplative'
            : 'immersive',
  }
  const features = musicFeaturesFromPlay(composition)
  const base = architectureFromMusic(features, site)
  const placedSpeakers = playObjects.filter((object) => object.kind === 'speaker').map(playObjectToSpeaker)
  const authoredItems = [
    ...base.items.filter((item) => item.kind !== 'canopy' && item.kind !== 'water'),
  ]

  if (parameters.water > 0.14) {
    authoredItems.push(
      item(
        'water',
        'Rivo · water mirror',
        geometry.groundWidthM * 0.16,
        geometry.groundDepthM * 0.16,
        Math.max(3.4, Math.min(18, 2.5 + parameters.water * 13)),
        Math.max(2, Math.min(10, 1.5 + parameters.water * 7)),
        0.07,
        0,
        0,
        'design-water',
        '#4e8fa8',
      ),
    )
  }

  if (parameters.canopy > 0.12) {
    authoredItems.push(
      item(
        'canopy',
        'Corona · living roof',
        0,
        -geometry.groundDepthM * 0.1,
        Math.max(4, geometry.canopyRadiusM * 1.7),
        Math.max(3, geometry.canopyRadiusM * 1.15),
        0.16,
        Math.max(2.8, geometry.canopyHeightM),
        0,
        'design-wood',
        '#a88c68',
      ),
    )
  }

  const stoneCount = Math.min(4, Math.round(parameters.stone * 4))
  for (let index = 0; index < stoneCount; index += 1) {
    const angle = (index / Math.max(1, stoneCount)) * Math.PI * 2 - Math.PI / 2
    authoredItems.push(
      item(
        'column',
        `Pietra ${index + 1}`,
        Math.cos(angle) * geometry.groundWidthM * 0.28,
        Math.sin(angle) * geometry.groundDepthM * 0.28,
        0.45 + parameters.stone * 0.3,
        0.45 + parameters.stone * 0.3,
        1.2 + parameters.stone * 3.6,
        0,
        0,
        'design-concrete',
        '#7a7d77',
      ),
    )
  }

  const zones = [...base.zones]
  if (parameters.water > 0.36 && !zones.some((zone) => zone.kind === 'water-edge')) {
    zones.push({
      id: 'zone-water-edge-play',
      name: 'Water edge',
      kind: 'water-edge',
      xM: geometry.groundWidthM * 0.14,
      zM: geometry.groundDepthM * 0.16,
      widthM: Math.max(3, parameters.water * 8),
      depthM: Math.max(2, parameters.water * 6),
      ceilingHeightM: Math.max(2, geometry.canopyHeightM * 0.45),
      exposure: 'outdoor',
    })
  }

  const planting = (Object.entries(vegetation.strata) as Array<[keyof typeof vegetation.strata, number]>).map(
    ([stratum, quantity]) => ({
      stratum,
      quantity: Math.max(1, Math.round(quantity * 0.32)),
      rationale:
        stratum === 'large-tree'
          ? 'Canopy roof and the long shadow behind the river.'
          : stratum === 'ground-cover'
            ? 'Fine-grained absorption, rustle and soil protection.'
            : 'A layer of the vertical garden, tuned by the Play parameters.',
    }),
  )

  const placedItems = playObjects
    .filter((object) => object.kind !== 'speaker')
    .map(playObjectToItem)

  return {
    ...base,
    site,
    footprint: { widthM: geometry.groundWidthM, depthM: geometry.groundDepthM },
    ceilingHeightM: Math.round(geometry.canopyHeightM * 10) / 10,
    items: [...authoredItems, ...placedItems],
    zones,
    speakers: placedSpeakers.length > 0 ? placedSpeakers : base.speakers,
    planting,
    acoustics: {
      targetT60S: Math.round(acoustics.t60S * 10) / 10,
      targetDirectToReverberantDb: Math.round(acoustics.directToReverberantDb * 10) / 10,
      targetUniformityDb: Math.round((2.8 + composition.music.descriptor.roughness * 2.4) * 10) / 10,
    },
    rationale: [
      ...base.rationale,
      `PLAY · Corona ${percent(parameters.canopy)} + Rivo ${percent(parameters.water)} → canopy ${geometry.canopyCoverage.toFixed(2)}, water ${geometry.waterAreaM2.toFixed(0)} m².`,
      `PLAY · Pietra ${percent(parameters.stone)} → T60 ${acoustics.t60S.toFixed(2)} s, absorption ${acoustics.meanAbsorption.toFixed(2)}, scattering ${acoustics.meanScattering.toFixed(2)}.`,
      `PLAY · Luce ${percent(parameters.light)} + Stagione ${composition.season.label} → ${music.descriptorLabel}.`,
      `PLAY · Ospiti ${percent(parameters.guests)} → ${social.visitorCount} motifs, ${social.distinctKeys} key centres, inclusion ${social.inclusion.toFixed(2)}.`,
      `PLAY · Data→Music weight ${music.dataWeight.toFixed(2)} · air ${composition.environmental.airQuality.toFixed(2)} · water ${composition.environmental.waterQuality.toFixed(2)}.`,
      playObjects.length > 0
        ? `PLAY · ${playObjects.length} placed objects · ${playObjects.filter((object) => object.kind === 'speaker').length} placed speakers.`
        : 'PLAY · no placed objects yet.',
    ],
  }
}

export function playCompositionSummary(composition: PlayComposition): string {
  const { music, geometry, social, environmental } = composition
  return `${music.descriptorLabel} · corona ${geometry.canopyCoverage.toFixed(2)} · ${social.visitorCount} ospiti · aria ${environmental.airQuality.toFixed(2)}`
}

function item(
  kind: ArchitecturalItemSpec['kind'],
  label: string,
  xM: number,
  zM: number,
  widthM: number,
  depthM: number,
  heightM: number,
  baseHeightM: number,
  rotationDeg: number,
  materialId: string,
  color: string,
): ArchitecturalItemSpec {
  return {
    id: `play-${kind}-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    kind,
    label,
    xM: Math.round(xM * 10) / 10,
    zM: Math.round(zM * 10) / 10,
    widthM: Math.round(widthM * 10) / 10,
    depthM: Math.round(depthM * 10) / 10,
    heightM: Math.round(heightM * 100) / 100,
    baseHeightM: Math.round(baseHeightM * 10) / 10,
    rotationDeg,
    materialId,
    color,
  }
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`
}
