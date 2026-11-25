export interface NetworkBudgetInput {
  channels: number
  sampleRateHz?: number
  bitDepth?: 16 | 24 | 32
  switchHops?: number
  latencyTargetMs?: number
  redundant?: boolean
}

export interface NetworkBudget {
  channels: number
  rawMbps: number
  overheadFactor: number
  budgetedMbps: number
  recommendedSwitchGbps: number
  switchPorts: number
  latencyBudgetMs: number
  latencyTargetMs: number
  meetsLatencyTarget: boolean
  requirements: string[]
  notes: string[]
}

/**
 * First-order Dante/AES67 network budget. Packet headers, clocking and
 * redundancy are represented by an overhead factor; use a captured network
 * trace for final commissioning.
 */
export function estimateNetworkBudget(input: NetworkBudgetInput): NetworkBudget {
  const channels = Math.max(0, Math.round(input.channels))
  const sampleRate = input.sampleRateHz ?? 48000
  const bitDepth = input.bitDepth ?? 24
  const overheadFactor = input.redundant ? 1.65 : 1.35
  const rawMbps = (channels * sampleRate * bitDepth) / 1e6
  const budgetedMbps = rawMbps * overheadFactor
  const recommendedSwitchGbps = Math.max(1, Math.ceil((budgetedMbps / 1000) * 2 * 10) / 10)
  const switchPorts = Math.max(8, Math.ceil((channels / 8 + 2) / 8) * 8)
  const switchHops = Math.max(1, input.switchHops ?? 1)
  const latencyTargetMs = input.latencyTargetMs ?? 10
  const latencyBudgetMs = 0.5 + switchHops * 0.15 + 0.5 + 0.5
  const meetsLatencyTarget = latencyBudgetMs <= latencyTargetMs

  return {
    channels,
    rawMbps: round(rawMbps, 3),
    overheadFactor,
    budgetedMbps: round(budgetedMbps, 3),
    recommendedSwitchGbps,
    switchPorts,
    latencyBudgetMs: round(latencyBudgetMs, 2),
    latencyTargetMs,
    meetsLatencyTarget,
    requirements: [
      'IGMP snooping v2/v3 with querier',
      'QoS: PTP event DSCP 56, audio DSCP 46, best effort 0',
      'PTPv2 (IEEE 1588) boundary clock or transparent clock',
      'Disable EEE / green Ethernet on audio ports',
      'Separate VLAN for audio and control where policy allows',
    ],
    notes: [
      'Budget uses uncompressed PCM payload; actual Dante flows add packet headers and clock traffic.',
      'Keep primary and secondary networks physically separate for redundancy.',
      'Verify end-to-end latency with the target Dante latency setting, not only the switch budget.',
    ],
  }
}

export function estimateDanteChannels(outputChannels: number, speakersWithDante: number): number {
  return Math.max(0, outputChannels) + Math.max(0, speakersWithDante)
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}
