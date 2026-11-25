import type {
  AcousticZone,
  ArchitecturalEnvironment,
  BoundarySurface,
  OutputChannel,
  SpatialAudioSession,
  SpatialSource,
  SpeakerPlacement,
  Vec2,
} from '@aura-spec/core-acoustics'
import type {
  ArchitectureIntent,
  ArchitecturalItemSpec,
  SoundscapePlan,
} from '@aura-spec/design-bridge'
import { DESIGN_MATERIALS } from './materials'

export function environmentFromIntent(
  intent: ArchitectureIntent,
  base: ArchitecturalEnvironment,
): ArchitecturalEnvironment {
  const now = new Date().toISOString()
  const materials = mergeMaterials(base, DESIGN_MATERIALS)
  const surfaces = intent.items.map(surfaceFromItem)
  const zones = intent.zones.map((zone) => acousticZoneFromDesign(zone))
  const coreZone = intent.zones.find((zone) => zone.kind === 'core') ?? intent.zones[0]
  const listenerFootprint = coreZone
    ? rectangleFootprint(coreZone.xM, coreZone.zM, coreZone.widthM, coreZone.depthM)
    : rectangleFootprint(0, 0, intent.footprint.widthM, intent.footprint.depthM)

  return {
    ...base,
    name: `Designed ${intent.site.siteKind} space`,
    description: `Generated from a music-first brief: ${intent.rationale[0] ?? ''}`,
    materials,
    surfaces,
    zones,
    listenerPlanes: [
      {
        id: 'listener-design',
        name: 'Design listening plane',
        heightM: 1.2,
        footprint: listenerFootprint,
        resolutionM: 0.5,
        targets: {
          uniformityDb: intent.acoustics.targetUniformityDb,
          minDirectToReverberantDb: intent.acoustics.targetDirectToReverberantDb,
        },
        tags: ['design'],
      },
    ],
    imports: base.imports,
    metadata: {
      ...base.metadata,
      updatedAt: now,
      author: 'AURA-SPEC design studio',
      tags: [...new Set([...base.metadata.tags, 'design', intent.site.siteKind])],
    },
  }
}

export function sessionFromIntent(
  intent: ArchitectureIntent,
  base: SpatialAudioSession,
): SpatialAudioSession {
  const now = new Date().toISOString()
  const placements: SpeakerPlacement[] = intent.speakers.map((speaker) => ({
    id: speaker.id,
    profileId: speaker.profileId,
    label: speaker.label,
    positionM: [speaker.xM, speaker.yM, speaker.zM],
    orientationDeg: [speaker.yawDeg, 0, 0],
    gainDb: speaker.gainDb,
    delayMs: speaker.delayMs,
    polarity: 0,
    zoneId: speaker.zoneId,
    groupIds: ['design'],
    locked: false,
  }))
  const outputs: OutputChannel[] = placements.map((placement, index) => ({
    id: `out-${index + 1}`,
    index: index + 1,
    label: placement.label,
    busId: 'bus-main',
    speakerPlacementId: placement.id,
    protocol: 'dante',
    deviceId: 'design-dsp',
    deviceChannel: index + 1,
    gainDb: 0,
    delayMs: 0,
    polarity: 0,
    muted: false,
  }))

  return {
    ...base,
    name: `Designed ${intent.site.siteKind} session`,
    speakerPlacements: placements,
    outputs,
    metadata: {
      ...base.metadata,
      updatedAt: now,
      author: 'AURA-SPEC design studio',
      tags: [...new Set([...base.metadata.tags, 'design'])],
      notes: intent.rationale.join(' '),
    },
  }
}

export function sessionFromSoundscapePlan(
  plan: SoundscapePlan,
  base: SpatialAudioSession,
): SpatialAudioSession {
  const now = new Date().toISOString()
  const sources: SpatialSource[] = plan.sources.map((source, index) => ({
    id: source.id,
    name: source.name,
    kind: 'generator',
    positionM: source.positionM,
    orientationDeg: [0, 0, 0],
    spatialization: source.spatialization,
    busId: 'bus-main',
    gainDb: source.gainDb,
    spreadDeg: source.spreadDeg,
    distanceModel: 'inverse',
    refDistanceM: 1,
    maxDistanceM: 60,
    rolloffFactor: 1,
    dopplerFactor: 0,
    mute: false,
    solo: false,
    priority: index === 0 ? 2 : 1,
    trajectory: { enabled: false, loop: false, keyframes: [] },
    color: colorForIndex(index),
    metadata: {
      zoneId: source.zoneId,
      descriptor: source.descriptor,
      rationale: source.rationale,
      source: 'architecture-to-music',
    },
  }))

  return {
    ...base,
    name: `Soundscape · ${plan.globalDescriptor.mode} ${Math.round(plan.globalDescriptor.tempoBpm)} BPM`,
    sources,
    renderer: { ...base.renderer, primary: plan.spatialization },
    aiNodes: plan.zones.map((zone, index) => {
      const source = sources[index] ?? sources[0]
      return {
        id: `ai-${zone.zoneId}`,
        name: `${zone.name} · reactive bed`,
        role: 'ambient-bed' as const,
        provider: { kind: 'local' as const, modelId: 'aura-design-soundscape-v0' },
        prompt: `Maintain a ${zone.descriptor.mode} bed at ${Math.round(zone.descriptor.tempoBpm)} BPM for ${zone.name}; density ${zone.descriptor.density.toFixed(2)}, brightness ${zone.descriptor.brightness.toFixed(2)}, roughness ${zone.descriptor.roughness.toFixed(2)}.`,
        temperature: 0.6,
        parameters: {
          density: zone.descriptor.density,
          brightness: zone.descriptor.brightness,
          roughness: zone.descriptor.roughness,
          register: zone.descriptor.register,
        },
        bindings: {
          audioBusId: 'bus-main',
          sourceId: source?.id,
          sensorIds: [],
          spatialization: plan.spatialization,
        },
        guardrails: {
          maxSplDb: 85,
          maxDurationS: 3600,
          contentPolicy: 'Design proposal; human approval required before public performance',
          humanApprovalRequired: true,
        },
        enabled: true,
      }
    }),
    metadata: {
      ...base.metadata,
      updatedAt: now,
      author: 'AURA-SPEC design studio',
      tags: [...new Set([...base.metadata.tags, 'soundscape', plan.globalDescriptor.mode])],
      notes: plan.rationale.join(' '),
    },
  }
}

function surfaceFromItem(item: ArchitecturalItemSpec): BoundarySurface {
  return {
    id: `surface-${item.id}`,
    name: item.label,
    role: roleForKind(item.kind),
    geometry: {
      type: 'box',
      geometry: {
        sizeM: [item.widthM, Math.max(0.04, item.heightM), item.depthM],
        transform: {
          positionM: [item.xM, item.baseHeightM + item.heightM / 2, item.zM],
          rotationDeg: [item.rotationDeg, 0, 0],
        },
      },
    },
    materialId: item.materialId,
    layerIds: ['layer-design'],
    locked: false,
    visible: true,
  }
}

function roleForKind(kind: ArchitecturalItemSpec['kind']): BoundarySurface['role'] {
  if (kind === 'wall' || kind === 'column') return 'wall'
  if (kind === 'glass' || kind === 'opening') return 'glass'
  if (kind === 'canopy') return 'canopy'
  if (kind === 'planter') return 'soft'
  if (kind === 'water') return 'water'
  return 'floor'
}

function acousticZoneFromDesign(zone: ArchitectureIntent['zones'][number]): AcousticZone {
  return {
    id: zone.id,
    name: zone.name,
    kind: zone.exposure === 'indoor' ? 'room' : zone.exposure === 'sheltered' ? 'transition' : 'open-air',
    exposure: zone.exposure,
    footprint: rectangleFootprint(zone.xM, zone.zM, zone.widthM, zone.depthM),
    floorHeightM: 0,
    ceilingHeightM: zone.ceilingHeightM,
    tags: ['design', zone.kind],
  }
}

function rectangleFootprint(x: number, z: number, width: number, depth: number): Vec2[] {
  return [
    [x - width / 2, z - depth / 2],
    [x + width / 2, z - depth / 2],
    [x + width / 2, z + depth / 2],
    [x - width / 2, z + depth / 2],
  ]
}

function mergeMaterials(
  base: ArchitecturalEnvironment,
  designMaterials: typeof DESIGN_MATERIALS,
): ArchitecturalEnvironment['materials'] {
  const seen = new Set(base.materials.map((material) => material.id))
  return [...base.materials, ...designMaterials.filter((material) => !seen.has(material.id))]
}

function colorForIndex(index: number): string {
  const colors = ['#8ad7c1', '#7fb3ff', '#ffd166', '#d99cff', '#ff9f7b', '#a6e36f']
  return colors[index % colors.length]!
}
