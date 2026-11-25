import type { Mode, MusicalDescriptor, Register } from './music'
import { MODE_INTERVALS, clamp, clamp01, normalizePitchClass, validateDescriptor } from './music'

export type MixRole = 'lead' | 'support' | 'pedal' | 'texture'

export interface VisitorMusicalInput {
  id: string
  visitorId: string
  zoneId: string
  descriptor: MusicalDescriptor
  durationS: number
  /** Relative claim on attention and density. Default 1. */
  priority?: number
  channelPreference?: number
}

export interface CoexistencePolicy {
  /** Maximum total perceptual density per zone. */
  maxDensity: number
  maxTempoDriftPct: number
  maxTranspositionSemitones: number
  channelCount: number
}

export interface ZoneMix {
  inputId: string
  visitorId: string
  zoneId: string
  channel: number
  transpositionSemitones: number
  tempoScale: number
  /** 0–maxDensity share allocated to this input. */
  densityShare: number
  gainDb: number
  role: MixRole
  warnings: string[]
}

export interface CoexistenceResult {
  globalTonic: number
  globalMode: Mode
  globalTempo: number
  meter: [number, number]
  sourceCount: number
  zoneMixes: ZoneMix[]
  warnings: string[]
}

export const DEFAULT_COEXISTENCE_POLICY: CoexistencePolicy = {
  maxDensity: 1,
  maxTempoDriftPct: 5,
  maxTranspositionSemitones: 6,
  channelCount: 8,
}

/**
 * Syntagma-derived coexistence pass.
 *
 * The existing SYNTAGMA/GLooper engine treats cells, groups and voices as a
 * mutable performance graph. This function is the portable, deterministic
 * contract for a multi-visitor landscape installation: it does not own audio,
 * it decides how independent musical claims can share a zone without erasing
 * each other.
 */
export function composeCoexistence(
  inputs: readonly VisitorMusicalInput[],
  policy: CoexistencePolicy = DEFAULT_COEXISTENCE_POLICY,
): CoexistenceResult {
  if (inputs.length === 0) {
    return {
      globalTonic: 0,
      globalMode: 'dorian',
      globalTempo: 60,
      meter: [4, 4],
      sourceCount: 0,
      zoneMixes: [],
      warnings: ['No visitor musical inputs'],
    }
  }

  const warnings: string[] = []
  for (const input of inputs) {
    const issues = validateDescriptor(input.descriptor)
    for (const issue of issues) warnings.push(`${input.id}: ${issue}`)
    if (input.durationS <= 0) warnings.push(`${input.id}: durationS must be positive`)
  }

  const weighted = inputs.map((input) => ({
    input,
    weight: Math.max(0.001, input.priority ?? 1),
  }))
  const globalTonic = weightedPitchClass(weighted)
  const globalMode = weightedMode(weighted)
  const globalTempo = weightedMedian(
    weighted.map((entry) => ({ value: entry.input.descriptor.tempoBpm, weight: entry.weight })),
  )
  const meterSource = [...weighted].sort((a, b) => b.weight - a.weight)[0]!.input.descriptor

  const zones = [...new Set(inputs.map((input) => input.zoneId))]
  const channelsPerZone = Math.max(1, Math.floor(policy.channelCount / Math.max(1, zones.length)))
  const zoneIndex = new Map(zones.map((zone, index) => [zone, index]))
  const indexInZone = new Map<string, number>()
  const zoneRawDensity = new Map<string, number>()

  for (const entry of weighted) {
    const zone = entry.input.zoneId
    zoneRawDensity.set(
      zone,
      (zoneRawDensity.get(zone) ?? 0) + Math.max(0, entry.input.descriptor.density) * entry.weight,
    )
  }

  const mixes: ZoneMix[] = []
  for (const entry of weighted) {
    const input = entry.input
    const zone = input.zoneId
    const position = indexInZone.get(zone) ?? 0
    indexInZone.set(zone, position + 1)
    const zoneSum = Math.max(1e-6, zoneRawDensity.get(zone) ?? 1)
    const zoneScale = Math.min(1, policy.maxDensity / zoneSum)
    const densityShare = clamp01(input.descriptor.density * entry.weight * zoneScale)
    const { semitones, compatible } = findCompatibleTransposition(
      input.descriptor.tonicPc,
      globalTonic,
      globalMode,
      policy.maxTranspositionSemitones,
    )
    const tempo = reconcileTempo(input.descriptor.tempoBpm, globalTempo, policy.maxTempoDriftPct)
    const role = chooseRole(entry, weighted, zone)
    const channel =
      (zoneIndex.get(zone) ?? 0) * channelsPerZone + position

    const inputWarnings: string[] = []
    if (!compatible) {
      inputWarnings.push(
        `${input.id}: no transposition within ±${policy.maxTranspositionSemitones} semitones reaches ${globalMode}`,
      )
    }
    if (Math.abs(tempo.effectiveBpm - globalTempo) > (globalTempo * policy.maxTempoDriftPct) / 100 + 0.5) {
      inputWarnings.push(
        `${input.id}: tempo ${input.descriptor.tempoBpm} BPM cannot reach ${globalTempo} BPM within ±${policy.maxTempoDriftPct}%`,
      )
    }
    if (channel >= policy.channelCount) {
      inputWarnings.push(`${input.id}: channel ${channel} exceeds the ${policy.channelCount}-channel budget`)
    }
    if (densityShare < input.descriptor.density * 0.5) {
      inputWarnings.push(`${input.id}: density reduced to keep the zone within ${policy.maxDensity}`)
    }

    mixes.push({
      inputId: input.id,
      visitorId: input.visitorId,
      zoneId: zone,
      channel,
      transpositionSemitones: semitones,
      tempoScale: tempo.scale,
      densityShare,
      gainDb: gainForRole(role),
      role,
      warnings: inputWarnings,
    })
  }

  for (const mix of mixes) warnings.push(...mix.warnings)
  if (mixes.some((mix) => mix.channel >= policy.channelCount)) {
    warnings.push('Channel allocation overflow: reduce zones or increase channelCount')
  }

  return {
    globalTonic,
    globalMode,
    globalTempo: Math.round(globalTempo * 100) / 100,
    meter: meterSource.meter,
    sourceCount: inputs.length,
    zoneMixes: mixes,
    warnings: [...new Set(warnings)],
  }
}

export function findCompatibleTransposition(
  inputTonic: number,
  globalTonic: number,
  globalMode: Mode,
  maxSemitones: number,
): { semitones: number; compatible: boolean } {
  const intervals = MODE_INTERVALS[globalMode]
  let best: number | null = null
  const max = Math.floor(Math.abs(maxSemitones))
  for (let semitones = -max; semitones <= max; semitones += 1) {
    const mapped = normalizePitchClass(inputTonic + semitones)
    if (!intervals.includes(mapped)) continue
    if (best === null || Math.abs(semitones) < Math.abs(best)) best = semitones
  }
  if (best !== null) return { semitones: best, compatible: true }

  const nearest = ((globalTonic - inputTonic + 18) % 12) - 6
  return {
    semitones: clamp(Math.round(nearest), -max, max),
    compatible: false,
  }
}

export function reconcileTempo(
  inputTempo: number,
  globalTempo: number,
  maxDriftPct: number,
): { scale: number; effectiveBpm: number } {
  const base = globalTempo / Math.max(1, inputTempo)
  const candidates = [base, base * 2, base / 2].filter((value) => value > 0)
  const closest = candidates.reduce((best, value) =>
    Math.abs(value - 1) < Math.abs(best - 1) ? value : best,
  )
  const drift = Math.max(0, maxDriftPct) / 100
  const scale = clamp(closest, 1 - drift, 1 + drift)
  return {
    scale: Math.round(scale * 10000) / 10000,
    effectiveBpm: Math.round(inputTempo * scale * 100) / 100,
  }
}

export function roleForDescriptor(descriptor: MusicalDescriptor): MixRole {
  if (descriptor.register === 'low' && descriptor.density < 0.35) return 'pedal'
  if (descriptor.density >= 0.65) return 'lead'
  return 'texture'
}

export function registerOrder(register: Register): number {
  return register === 'low' ? 0 : register === 'mid' ? 1 : 2
}

function chooseRole(
  entry: { input: VisitorMusicalInput; weight: number },
  all: readonly { input: VisitorMusicalInput; weight: number }[],
  zone: string,
): MixRole {
  const zoneEntries = all.filter((item) => item.input.zoneId === zone)
  const highest = zoneEntries.reduce((best, item) => (item.weight > best.weight ? item : best), zoneEntries[0]!)
  if (highest.input.id === entry.input.id) return 'lead'
  const base = roleForDescriptor(entry.input.descriptor)
  return base === 'lead' ? 'support' : base
}

function gainForRole(role: MixRole): number {
  return role === 'lead' ? 0 : role === 'pedal' ? -6 : -3
}

function weightedPitchClass(entries: readonly { input: VisitorMusicalInput; weight: number }[]): number {
  const votes = new Array<number>(12).fill(0)
  for (const entry of entries) {
    votes[normalizePitchClass(entry.input.descriptor.tonicPc)]! += entry.weight
  }
  let bestPc = 0
  let bestWeight = -1
  for (let pc = 0; pc < 12; pc += 1) {
    if (votes[pc]! > bestWeight) {
      bestWeight = votes[pc]!
      bestPc = pc
    }
  }
  return bestPc
}

function weightedMode(entries: readonly { input: VisitorMusicalInput; weight: number }[]): Mode {
  const votes = new Map<Mode, number>()
  for (const entry of entries) {
    votes.set(entry.input.descriptor.mode, (votes.get(entry.input.descriptor.mode) ?? 0) + entry.weight)
  }
  const sorted = [...votes.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  return sorted[0]?.[0] ?? 'dorian'
}

function weightedMedian(values: readonly { value: number; weight: number }[]): number {
  const sorted = [...values].sort((a, b) => a.value - b.value)
  const total = sorted.reduce((sum, item) => sum + item.weight, 0)
  let cumulative = 0
  for (const item of sorted) {
    cumulative += item.weight
    if (cumulative >= total / 2) return item.value
  }
  return sorted[sorted.length - 1]?.value ?? 60
}
