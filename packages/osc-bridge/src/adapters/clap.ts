import type { SpatialAudioSession, SpatialSource } from '@aura-spec/core-acoustics'

export type ClapParameterModule = 'source' | 'renderer' | 'master'

export interface ClapParameterDescriptor {
  id: number
  name: string
  module: ClapParameterModule
  min: number
  max: number
  defaultValue: number
  unit?: string
  stepped?: boolean
  /** Normalised value used by CLAP hosts. */
  toNormalized: (value: number) => number
  fromNormalized: (value: number) => number
}

/**
 * Parameter contract for a future CLAP/VST3 spatialisation plugin.
 *
 * The native plugin should share the same OSC address space and the same
 * coordinate convention as the web client. The plugin can either receive OSC
 * packets from the bridge or link `core-acoustics` directly for the same math.
 */
export function clapParametersForSession(session: SpatialAudioSession): ClapParameterDescriptor[] {
  const parameters: ClapParameterDescriptor[] = []
  for (const source of session.sources) {
    const sourceKey = stableId(source.id)
    parameters.push(
      makeParameter(`${source.id}.x`, sourceKey, 'source', -50, 50, source.positionM[0], 'm'),
      makeParameter(`${source.id}.y`, sourceKey + 1, 'source', -50, 50, source.positionM[1], 'm'),
      makeParameter(`${source.id}.z`, sourceKey + 2, 'source', -50, 50, source.positionM[2], 'm'),
      makeParameter(`${source.id}.gain`, sourceKey + 3, 'source', -60, 12, source.gainDb, 'dB'),
      makeParameter(`${source.id}.spread`, sourceKey + 4, 'source', 0, 360, source.spreadDeg, 'deg'),
    )
  }
  parameters.push(
    makeParameter('renderer.order', 900_001, 'renderer', 1, 7, session.renderer.hoaOrder, '', true),
    makeParameter('renderer.masterGain', 900_002, 'renderer', -60, 12, 0, 'dB'),
  )
  return parameters
}

export function sourceParameterValues(source: SpatialSource): number[] {
  return [...source.positionM, source.gainDb, source.spreadDeg]
}

export function normalizeClapValue(parameter: ClapParameterDescriptor, value: number): number {
  return parameter.toNormalized(value)
}

export function denormalizeClapValue(parameter: ClapParameterDescriptor, normalized: number): number {
  return parameter.fromNormalized(normalized)
}

function makeParameter(
  name: string,
  id: number,
  module: ClapParameterModule,
  min: number,
  max: number,
  defaultValue: number,
  unit?: string,
  stepped = false,
): ClapParameterDescriptor {
  const toNormalized = (value: number): number => {
    const clamped = Math.min(max, Math.max(min, value))
    if (stepped) return (Math.round(clamped) - min) / Math.max(max - min, 1)
    return (clamped - min) / Math.max(max - min, 1)
  }
  const fromNormalized = (value: number): number => {
    if (stepped) return Math.round(min + Math.min(1, Math.max(0, value)) * (max - min))
    return min + Math.min(1, Math.max(0, value)) * (max - min)
  }
  return {
    id: Math.abs(id) % 0x7fffffff,
    name,
    module,
    min,
    max,
    defaultValue,
    unit,
    stepped,
    toNormalized,
    fromNormalized,
  }
}

/** FNV-1a, used only to derive stable non-overlapping parameter ids. */
function stableId(value: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0) % 800_000
}
