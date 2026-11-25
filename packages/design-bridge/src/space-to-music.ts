import type {
  ArchitecturalEnvironment,
  AcousticZone,
  BoundarySurface,
  SpatialAudioSession,
  SurfaceMaterial,
  Vec2,
} from '@aura-spec/core-acoustics'
import { bandValueAt, sabineT60 } from '@aura-spec/core-acoustics'
import type { MusicalDescriptor, Register, Timbre } from '@aura-spec/landscape-culture'
import { clamp, clamp01, hashString } from './types'
import type {
  SoundscapeMetrics,
  SoundscapePlan,
  SuggestedSource,
  ZoneSoundscape,
} from './types'

/**
 * Architecture-first design pass.
 *
 * The building is read as a musical instrument: volume and absorption give
 * reverberation, glass and hard surfaces give brightness/roughness, zone count
 * gives polyphony, ceiling height gives register, and the speaker layout gives
 * the spatialisation strategy. The result is a proposal with rationale, not a
 * hidden generative decision.
 */
export function soundscapeFromArchitecture(
  environment: ArchitecturalEnvironment,
  session: SpatialAudioSession,
): SoundscapePlan {
  const warnings: string[] = []
  const materials = new Map(environment.materials.map((material) => [material.id, material]))
  const surfaceMetrics = measureSurfaces(environment, materials)
  const volumeM3 = estimateVolume(environment)
  const totalArea = surfaceMetrics.totalArea
  const t60S = sabineT60(volumeM3, totalArea, surfaceMetrics.meanAbsorption)
  const zoneCount = Math.max(1, environment.zones.length)
  const speakerCount = session.speakerPlacements.length
  const listenerAreaM2 = environment.listenerPlanes.reduce(
    (sum, plane) => sum + polygonArea(plane.footprint),
    0,
  )

  const hardRatio = surfaceMetrics.hardArea / Math.max(totalArea, 1e-9)
  const glassRatio = surfaceMetrics.glassArea / Math.max(totalArea, 1e-9)
  const softRatio = surfaceMetrics.softArea / Math.max(totalArea, 1e-9)
  const waterPresence = surfaceMetrics.waterArea / Math.max(totalArea, 1e-9)
  const canopyPresence = surfaceMetrics.canopyArea / Math.max(totalArea, 1e-9)
  const ceilingHeight = averageCeilingHeight(environment)
  const brightness = clamp01(
    glassRatio * 0.7 +
      waterPresence * 0.2 +
      (1 - surfaceMetrics.meanAbsorption) * 0.35 +
      environment.defaultConditions.temperatureC / 100,
  )
  const roughness = clamp01(hardRatio * 0.7 + canopyPresence * 0.2 + (1 - softRatio) * 0.15)
  const density = clamp01(zoneCount * 0.12 + hardRatio * 0.28 + softRatio * 0.2 + 0.15)
  const tempoBpm = clamp(
    48 + zoneCount * 4 + (1 - softRatio) * 12 + volumeM3 / 500 + t60S * 2,
    40,
    120,
  )
  const mode = chooseMode(brightness, roughness, softRatio, glassRatio)
  const register: Register = ceilingHeight < 4 ? 'low' : ceilingHeight < 8 ? 'mid' : 'high'
  const timbre = chooseTimbre(surfaceMetrics)
  const spatialization =
    session.outputs.length >= 8 || zoneCount >= 3
      ? 'hoa'
      : zoneCount > 1
        ? 'vbap'
        : 'object'

  const globalDescriptor: MusicalDescriptor = {
    tonicPc: hashString(`${environment.id}:${session.id}`) % 12,
    mode,
    tempoBpm: Math.round(tempoBpm * 10) / 10,
    meter: session.transport.timeSignature,
    register,
    density: Math.round(density * 100) / 100,
    brightness: Math.round(brightness * 100) / 100,
    roughness: Math.round(roughness * 100) / 100,
    timbre,
  }

  const zones = environment.zones.length > 0 ? environment.zones : [fallbackZone(environment)]
  const channelsPerZone = Math.max(1, Math.floor(Math.max(1, session.outputs.length) / zones.length))
  const zonePlans: ZoneSoundscape[] = zones.map((zone, index) => {
    const centre = zoneCentre(zone, environment)
    const zoneHeight = (zone.ceilingHeightM ?? ceilingHeight) - (zone.floorHeightM ?? 0)
    const zoneDensity = clamp01(
      density + (zone.kind === 'listener' ? 0.1 : 0) + (zone.kind === 'service' ? -0.1 : 0),
    )
    const zoneBrightness = clamp01(
      brightness + (zone.exposure === 'outdoor' ? 0.08 : -0.04) + (zone.kind === 'open-air' ? 0.06 : 0),
    )
    const descriptor: MusicalDescriptor = {
      ...globalDescriptor,
      register: zoneHeight < 3.5 ? 'low' : zoneHeight < 7 ? 'mid' : 'high',
      density: Math.round(zoneDensity * 100) / 100,
      brightness: Math.round(zoneBrightness * 100) / 100,
      roughness: Math.round(clamp01(roughness + (zone.exposure === 'outdoor' ? 0.05 : 0)) * 100) / 100,
      timbre: zone.kind === 'open-air' ? 'airy' : globalDescriptor.timbre,
    }
    const source: SuggestedSource = {
      id: `soundscape-${zone.id}`,
      name: `${zone.name} · soundscape bed`,
      zoneId: zone.id,
      positionM: [centre.xM, 1.4, centre.zM],
      descriptor,
      spatialization,
      gainDb: -12,
      spreadDeg: Math.round(70 + zoneDensity * 90),
      rationale: `${zone.name} derives register from ${zoneHeight.toFixed(1)} m height and density from its exposure (${zone.exposure}).`,
    }
    return {
      zoneId: zone.id,
      name: zone.name,
      channelStart: index * channelsPerZone,
      channelCount: Math.min(channelsPerZone, Math.max(1, session.outputs.length - index * channelsPerZone)),
      descriptor,
      sources: [source],
    }
  })

  if (surfaceMetrics.totalArea <= 0) warnings.push('No boundary surfaces found; using default acoustic assumptions')
  if (zoneCount === 1) warnings.push('Single acoustic zone; the soundscape will be more monolithic than polyphonic')
  if (speakerCount === 0) warnings.push('No speaker placements; the soundscape cannot be rendered until a layout exists')
  if (t60S > 4) warnings.push(`Estimated T60 ${t60S.toFixed(1)} s is very long for intelligible sound`)
  if (t60S < 0.25 && environment.zones.some((zone) => zone.exposure === 'indoor')) {
    warnings.push(`Estimated T60 ${t60S.toFixed(2)} s is very dry; consider diffusion or a longer tail`)
  }

  const metrics: SoundscapeMetrics = {
    volumeM3: round(volumeM3, 1),
    surfaceAreaM2: round(totalArea, 1),
    t60S: round(Number.isFinite(t60S) ? t60S : 0, 2),
    glassRatio: round(glassRatio, 3),
    hardRatio: round(hardRatio, 3),
    softRatio: round(softRatio, 3),
    waterPresence: round(waterPresence, 3),
    canopyPresence: round(canopyPresence, 3),
    zoneCount,
    speakerCount,
    listenerAreaM2: round(listenerAreaM2, 1),
  }

  return {
    globalDescriptor,
    metrics,
    zones: zonePlans,
    sources: zonePlans.flatMap((zone) => zone.sources),
    spatialization,
    rationale: [
      `Volume ${metrics.volumeM3} m³, surface ${metrics.surfaceAreaM2} m², mean absorption ${surfaceMetrics.meanAbsorption.toFixed(2)} → T60 ${metrics.t60S} s.`,
      `Glass ${(glassRatio * 100).toFixed(0)}% and hard surfaces ${(hardRatio * 100).toFixed(0)}% → brightness ${globalDescriptor.brightness.toFixed(2)}, roughness ${globalDescriptor.roughness.toFixed(2)}.`,
      `Ceiling ${ceilingHeight.toFixed(1)} m → ${register} register; ${zoneCount} zones → ${spatialization.toUpperCase()} layout.`,
      `${speakerCount} speakers → ${zonePlans.length} zone beds with ${channelsPerZone} channel(s) per zone.`,
      `T60 and material absorption drive the mode (${mode}) rather than a fixed musical genre.`,
    ],
    warnings,
  }
}

interface SurfaceMetrics {
  totalArea: number
  glassArea: number
  hardArea: number
  softArea: number
  waterArea: number
  canopyArea: number
  meanAbsorption: number
  dominantCategory: SurfaceMaterial['category'] | null
}

function measureSurfaces(
  environment: ArchitecturalEnvironment,
  materials: Map<string, SurfaceMaterial>,
): SurfaceMetrics {
  let totalArea = 0
  let glassArea = 0
  let hardArea = 0
  let softArea = 0
  let waterArea = 0
  let canopyArea = 0
  let absorptionArea = 0
  const categoryArea = new Map<SurfaceMaterial['category'], number>()

  for (const surface of environment.surfaces) {
    const area = surfaceArea(surface)
    if (!Number.isFinite(area) || area <= 0) continue
    totalArea += area
    const material = materials.get(surface.materialId)
    const category = material?.category ?? 'other'
    categoryArea.set(category, (categoryArea.get(category) ?? 0) + area)
    const absorption = material ? bandValueAt(material.absorption, 1000) : 0.1
    absorptionArea += area * absorption
    if (surface.role === 'glass' || category === 'glass') glassArea += area
    if (surface.role === 'canopy') canopyArea += area
    if (surface.role === 'water' || category === 'water') waterArea += area
    if (['concrete', 'plaster', 'metal', 'glass', 'acoustic-panel'].includes(category)) hardArea += area
    if (['fabric', 'vegetation', 'soil', 'water', 'membrane'].includes(category)) softArea += area
  }

  let dominantCategory: SurfaceMaterial['category'] | null = null
  let dominantArea = 0
  for (const [category, area] of categoryArea) {
    if (area > dominantArea) {
      dominantArea = area
      dominantCategory = category
    }
  }

  return {
    totalArea,
    glassArea,
    hardArea,
    softArea,
    waterArea,
    canopyArea,
    meanAbsorption: totalArea > 0 ? absorptionArea / totalArea : 0.1,
    dominantCategory,
  }
}

function surfaceArea(surface: BoundarySurface): number {
  if (surface.areaM2 !== undefined) return surface.areaM2
  const geometry = surface.geometry
  if (geometry.type === 'plane') return geometry.geometry.widthM * geometry.geometry.depthM
  if (geometry.type === 'box') {
    const [width, height, depth] = geometry.geometry.sizeM
    return 2 * (width * height + width * depth + height * depth)
  }
  if (geometry.type === 'polygon-extrusion') {
    const footprint = geometry.geometry.footprint
    const area = Math.abs(polygonArea(footprint))
    const perimeter = polygonPerimeter(footprint)
    return perimeter * geometry.geometry.heightM + 2 * area
  }
  const positions = geometry.mesh.positions
  const indices = geometry.mesh.indices
  let total = 0
  for (let i = 0; i + 2 < indices.length; i += 3) {
    const a = indices[i]! * 3
    const b = indices[i + 1]! * 3
    const c = indices[i + 2]! * 3
    total += triangleArea(
      [positions[a]!, positions[a + 1]!, positions[a + 2]!],
      [positions[b]!, positions[b + 1]!, positions[b + 2]!],
      [positions[c]!, positions[c + 1]!, positions[c + 2]!],
    )
  }
  return total
}

function estimateVolume(environment: ArchitecturalEnvironment): number {
  if (environment.zones.length === 0) {
    const plane = environment.listenerPlanes[0]
    return plane ? polygonArea(plane.footprint) * 4 : 100
  }
  return environment.zones.reduce((sum, zone) => {
    const area = zone.footprint ? Math.abs(polygonArea(zone.footprint)) : 0
    const height = Math.max(0.5, (zone.ceilingHeightM ?? 4) - (zone.floorHeightM ?? 0))
    return sum + area * height
  }, 0)
}

function averageCeilingHeight(environment: ArchitecturalEnvironment): number {
  const heights = environment.zones
    .map((zone) => (zone.ceilingHeightM ?? 4) - (zone.floorHeightM ?? 0))
    .filter((height) => height > 0)
  if (heights.length === 0) return 4
  return heights.reduce((sum, height) => sum + height, 0) / heights.length
}

function zoneCentre(zone: AcousticZone, environment: ArchitecturalEnvironment): { xM: number; zM: number } {
  if (zone.footprint && zone.footprint.length > 0) {
    const [xM, zM] = polygonCentroid(zone.footprint)
    return { xM, zM }
  }
  const plane = environment.listenerPlanes[0]
  if (plane) {
    const [xM, zM] = polygonCentroid(plane.footprint)
    return { xM, zM }
  }
  return { xM: 0, zM: 0 }
}

function fallbackZone(environment: ArchitecturalEnvironment): AcousticZone {
  return {
    id: 'zone-fallback',
    name: 'Main field',
    kind: 'listener',
    exposure: environment.zones[0]?.exposure ?? 'indoor',
    footprint: environment.listenerPlanes[0]?.footprint ?? [
      [-5, -5],
      [5, -5],
      [5, 5],
      [-5, 5],
    ],
    floorHeightM: 0,
    ceilingHeightM: 4,
    tags: ['fallback'],
  }
}

function chooseMode(
  brightness: number,
  roughness: number,
  softRatio: number,
  glassRatio: number,
): MusicalDescriptor['mode'] {
  if (brightness > 0.68 && glassRatio > 0.12) return 'lydian'
  if (brightness > 0.58) return 'ionian'
  if (roughness > 0.62) return 'phrygian'
  if (softRatio > 0.42) return 'aeolian'
  return 'dorian'
}

function chooseTimbre(metrics: SurfaceMetrics): Timbre {
  switch (metrics.dominantCategory) {
    case 'glass':
      return 'airy'
    case 'water':
      return 'fluid'
    case 'vegetation':
    case 'wood':
      return 'woody'
    case 'metal':
      return 'metallic'
    case 'concrete':
    case 'plaster':
      return 'stone'
    case 'fabric':
    case 'membrane':
      return 'vocal'
    default:
      return 'hybrid'
  }
}

function polygonArea(points: readonly Vec2[]): number {
  let area = 0
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    area += (points[j]![0] + points[i]![0]) * (points[j]![1] - points[i]![1])
  }
  return area / 2
}

function polygonPerimeter(points: readonly Vec2[]): number {
  let perimeter = 0
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i]!
    const b = points[(i + 1) % points.length]!
    perimeter += Math.hypot(b[0] - a[0], b[1] - a[1])
  }
  return perimeter
}

function polygonCentroid(points: readonly Vec2[]): [number, number] {
  const area = polygonArea(points)
  if (Math.abs(area) < 1e-9) {
    const sum = points.reduce((acc, point) => [acc[0] + point[0], acc[1] + point[1]] as [number, number], [0, 0])
    return [sum[0] / Math.max(1, points.length), sum[1] / Math.max(1, points.length)]
  }
  let cx = 0
  let cz = 0
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const cross = points[j]![0] * points[i]![1] - points[i]![0] * points[j]![1]
    cx += (points[j]![0] + points[i]![0]) * cross
    cz += (points[j]![1] + points[i]![1]) * cross
  }
  return [cx / (6 * area), cz / (6 * area)]
}

function triangleArea(a: readonly number[], b: readonly number[], c: readonly number[]): number {
  const abx = b[0]! - a[0]!
  const aby = b[1]! - a[1]!
  const abz = b[2]! - a[2]!
  const acx = c[0]! - a[0]!
  const acy = c[1]! - a[1]!
  const acz = c[2]! - a[2]!
  const crossX = aby * acz - abz * acy
  const crossY = abz * acx - abx * acz
  const crossZ = abx * acy - aby * acx
  return Math.hypot(crossX, crossY, crossZ) / 2
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}
