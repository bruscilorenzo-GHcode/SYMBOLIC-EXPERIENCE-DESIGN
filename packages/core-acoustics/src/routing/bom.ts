import type { AcousticSpeakerProfile } from '../types/speaker'
import type { SpatialAudioSession } from '../types/session'
import { estimateNetworkBudget, type NetworkBudget } from './network'

export interface BomOptions {
  headroomDb?: number
  voltageMode?: 'low-z' | '70v' | '100v'
  cableRunM?: number
  includeOptionalAccessories?: boolean
  outdoorMargin?: number
  /** Zone exposure lookup, normally derived from `ArchitecturalEnvironment.zones`. */
  zoneExposure?: Record<string, 'indoor' | 'sheltered' | 'outdoor' | 'submerged'>
}

export interface BomLineItem {
  id: string
  category:
    | 'loudspeaker'
    | 'subwoofer'
    | 'amplifier'
    | 'transformer'
    | 'mount'
    | 'cable'
    | 'connector'
    | 'network-switch'
    | 'weatherproofing'
    | 'commissioning'
  description: string
  sku?: string
  quantity: number
  unit: 'pcs' | 'm' | 'set' | 'ch'
  unitPowerW?: number
  notes?: string
}

export interface BomTotals {
  speakerCount: number
  subwooferCount: number
  rmsPowerW: number
  peakPowerW: number
  amplifierPowerW: number
  tapLoadW: number
  danteChannels: number
  cableLengthM: number
  network: NetworkBudget
}

export interface BomResult {
  items: BomLineItem[]
  totals: BomTotals
  warnings: string[]
  assumptions: string[]
}

interface ProfileGroup {
  profile: AcousticSpeakerProfile
  count: number
  placements: string[]
}

/**
 * Deterministic BOM and infrastructure sketch. It intentionally favours
 * explainable first-order rules over opaque "smart" sizing:
 *  - low-Z: total RMS + headroom, parallel impedance check
 *  - 70/100 V: tap sum + 25% amplifier margin
 *  - network: Dante/AES67 payload + engineering overhead
 */
export function computeBom(
  session: SpatialAudioSession,
  profiles: readonly AcousticSpeakerProfile[],
  options: BomOptions = {},
): BomResult {
  const warnings: string[] = []
  const assumptions: string[] = [
    'Amplifier sizing is a first-order design allowance, not a manufacturer selection.',
    'Cable length is an estimate based on the configured average run and placement count.',
    'IP compatibility is checked against the zone exposure; final compliance requires project review.',
  ]

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]))
  const groups = new Map<string, ProfileGroup>()

  for (const placement of session.speakerPlacements) {
    const profile = profileById.get(placement.profileId)
    if (!profile) {
      warnings.push(`Placement "${placement.label}" references missing profile ${placement.profileId}`)
      continue
    }
    const group = groups.get(profile.id)
    if (group) {
      group.count += 1
      group.placements.push(placement.id)
    } else {
      groups.set(profile.id, { profile, count: 1, placements: [placement.id] })
    }
  }

  const items: BomLineItem[] = []
  let speakerCount = 0
  let subwooferCount = 0
  let rmsPowerW = 0
  let peakPowerW = 0
  let tapLoadW = 0
  let danteChannels = 0
  let cableLengthM = 0
  const voltageMode = options.voltageMode ?? 'low-z'
  const headroomDb = options.headroomDb ?? 10

  for (const group of groups.values()) {
    const { profile, count } = group
    const isSub = profile.kind === 'subwoofer'
    if (isSub) subwooferCount += count
    else speakerCount += count

    const unitRms = profile.acoustics.powerHandlingW.rmsW
    const unitPeak = profile.acoustics.powerHandlingW.peakW ?? unitRms * 4
    rmsPowerW += unitRms * count
    peakPowerW += unitPeak * count

    items.push({
      id: `spk-${profile.id}`,
      category: isSub ? 'subwoofer' : 'loudspeaker',
      description: `${profile.manufacturer.name} ${profile.model.name}`,
      sku: profile.model.code,
      quantity: count,
      unit: 'pcs',
      unitPowerW: unitRms,
      notes: `${profile.kind}; ${profile.physical.ipRating}; ${profile.physical.weightKg} kg`,
    })

    if (voltageMode !== 'low-z') {
      const tap = profile.electrical.tapsW?.[0] ?? unitRms
      tapLoadW += tap * count
      if (!profile.electrical.tapsW?.length) {
        warnings.push(`${profile.model.name} has no published ${voltageMode} tap; RMS power used as a placeholder`)
      }
      items.push({
        id: `xfmr-${profile.id}`,
        category: 'transformer',
        description: `${voltageMode} line transformer for ${profile.model.name}`,
        quantity: count,
        unit: 'pcs',
        notes: `Tap ${tap} W per unit`,
      })
    }

    const dante = profile.electrical.dante
    if (dante) danteChannels += dante.channels * count
    if (profile.electrical.aes67 || profile.electrical.avb) danteChannels += count

    for (const accessory of profile.accessories) {
      if (!accessory.included && !options.includeOptionalAccessories) continue
      items.push({
        id: `acc-${profile.id}-${accessory.id}`,
        category: accessory.type === 'mount' || accessory.type === 'bracket' ? 'mount' : 'connector',
        description: `${accessory.name} for ${profile.model.name}`,
        sku: accessory.sku,
        quantity: count,
        unit: 'pcs',
        notes: accessory.notes,
      })
    }

    cableLengthM += (options.cableRunM ?? 15) * count * (options.outdoorMargin ?? 1.1)

    const ip = parseIpRating(profile.physical.ipRating)
    const outdoorZone = session.speakerPlacements.some((placement) => {
      if (placement.profileId !== profile.id) return false
      if (!placement.zoneId) return false
      return options.zoneExposure?.[placement.zoneId] === 'outdoor'
    })
    if (outdoorZone && ip !== null && ip < 55) {
      warnings.push(`${profile.model.name}: ${profile.physical.ipRating} may be insufficient for an outdoor zone`)
    }
  }

  const linearGain = 10 ** (headroomDb / 10)
  const amplifierPowerW =
    voltageMode === 'low-z' ? rmsPowerW * linearGain : Math.max(tapLoadW * 1.25, 1)

  if (amplifierPowerW > 0) {
    items.push({
      id: 'amp-main',
      category: 'amplifier',
      description:
        voltageMode === 'low-z'
          ? `Low-Z amplification, ${headroomDb} dB headroom`
          : `${voltageMode} line amplifier, 25% margin`,
      quantity: 1,
      unit: 'set',
      unitPowerW: round(amplifierPowerW, 1),
      notes: `Total load ${round(rmsPowerW, 1)} W RMS; recommend distributed channels with per-zone DSP.`,
    })
  }

  if (cableLengthM > 0) {
    items.push({
      id: 'cable-main',
      category: 'cable',
      description: 'Loudspeaker cable, outdoor-rated where required',
      quantity: Math.ceil(cableLengthM),
      unit: 'm',
      notes: `Average run ${options.cableRunM ?? 15} m per placement, ${options.outdoorMargin ?? 1.1}× allowance`,
    })
  }

  const network = estimateNetworkBudget({
    channels: Math.max(danteChannels, session.outputs.length),
    sampleRateHz: session.renderer.sampleRateHz,
    redundant: true,
  })

  if (network.channels > 0) {
    items.push({
      id: 'switch-main',
      category: 'network-switch',
      description: `Managed audio switch, ${network.switchPorts} ports, PTPv2 + IGMP`,
      quantity: 1,
      unit: 'pcs',
      notes: `${network.budgetedMbps} Mbps budget; ${network.recommendedSwitchGbps} Gbps recommended`,
    })
  }

  checkImpedance(session, profileById, warnings)
  checkPowerBudget(session, profileById, rmsPowerW, headroomDb, warnings)

  return {
    items,
    totals: {
      speakerCount,
      subwooferCount,
      rmsPowerW: round(rmsPowerW, 1),
      peakPowerW: round(peakPowerW, 1),
      amplifierPowerW: round(amplifierPowerW, 1),
      tapLoadW: round(tapLoadW, 1),
      danteChannels,
      cableLengthM: Math.ceil(cableLengthM),
      network,
    },
    warnings: [...new Set(warnings)],
    assumptions,
  }
}

function checkImpedance(
  session: SpatialAudioSession,
  profiles: Map<string, AcousticSpeakerProfile>,
  warnings: string[],
): void {
  const byChannel = new Map<string, number[]>()
  for (const placement of session.speakerPlacements) {
    const profile = profiles.get(placement.profileId)
    if (!profile) continue
    const impedance = profile.electrical.nominalImpedanceOhm
    if (!impedance) continue
    const channel = placement.amplifierChannelId ?? 'unassigned'
    const list = byChannel.get(channel) ?? []
    list.push(impedance)
    byChannel.set(channel, list)
  }

  for (const [channel, impedances] of byChannel) {
    const parallel = 1 / impedances.reduce((sum, value) => sum + 1 / value, 0)
    if (parallel < 2) {
      warnings.push(`Amplifier channel ${channel}: ${round(parallel, 2)} Ω parallel load; verify amplifier rating`)
    }
  }
}

function checkPowerBudget(
  session: SpatialAudioSession,
  profiles: Map<string, AcousticSpeakerProfile>,
  rmsPowerW: number,
  headroomDb: number,
  warnings: string[],
): void {
  const peakRequested = session.speakerPlacements.reduce((sum, placement) => {
    const profile = profiles.get(placement.profileId)
    if (!profile) return sum
    return sum + (profile.acoustics.powerHandlingW.peakW ?? profile.acoustics.powerHandlingW.rmsW * 4)
  }, 0)

  if (peakRequested > rmsPowerW * 10 ** (headroomDb / 10) * 2) {
    warnings.push('Transient peak request exceeds the amplifier allowance by more than 2×; consider more headroom')
  }
}

function parseIpRating(value: string): number | null {
  const match = /^IP(\d)(\d)/i.exec(value.trim())
  if (!match) return null
  return Number(`${match[1]}${match[2]}`)
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}
