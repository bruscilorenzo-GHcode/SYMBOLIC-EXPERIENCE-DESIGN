import { COMMUNICATION_CHANNELS } from './zones'
import { clamp01 } from './states'
import type {
  CommunicationChannel,
  DiagnosticSample,
  DoppelgangerSpec,
  DoppelgangerTrait,
} from './types'

const CHANNEL_IDS: CommunicationChannel[] = ['self', 'twin', 'others', 'artefacts']

const DESCRIPTORS: Record<CommunicationChannel, { en: string; it: string }> = {
  self: { en: 'Mirror of the inner voice', it: 'Specchio della voce interiore' },
  twin: { en: 'Measured counterpart', it: 'Controparte misurata' },
  others: { en: 'Weaved presence', it: 'Presenza intrecciata' },
  artefacts: { en: 'Keeper of stories', it: 'Custode di storie' },
}

/** FNV-1a, deterministic across runs; the doppelgänger must never be random. */
export function hashDoppelgangerSeed(input: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

function sampleKey(sample: DiagnosticSample): string {
  return `${sample.channel}:${sample.id}:${sample.value.toFixed(3)}:${sample.at}`
}

/**
 * Builds the digital doppelgänger from the collected diagnostic samples.
 * The entity is constructed purely from data: same samples in, same entity out.
 */
export function deriveDoppelganger(samples: DiagnosticSample[]): DoppelgangerSpec | null {
  if (samples.length === 0) return null

  const totals = new Map<CommunicationChannel, { sum: number; count: number }>()
  for (const channel of CHANNEL_IDS) totals.set(channel, { sum: 0, count: 0 })
  let globalSum = 0
  for (const sample of samples) {
    const entry = totals.get(sample.channel)
    if (!entry) continue
    entry.sum += clamp01(sample.value)
    entry.count += 1
    globalSum += clamp01(sample.value)
  }

  const traits: DoppelgangerTrait[] = CHANNEL_IDS.map((channel) => {
    const entry = totals.get(channel)!
    const mean = entry.count > 0 ? entry.sum / entry.count : 0
    const presence = entry.count / samples.length
    return { channel, weight: Number((mean * 0.7 + presence * 0.3).toFixed(4)) }
  })

  let dominantChannel: CommunicationChannel = 'self'
  let dominantWeight = -1
  for (const trait of traits) {
    if (trait.weight > dominantWeight) {
      dominantWeight = trait.weight
      dominantChannel = trait.channel
    }
  }

  const complexity = clamp01(globalSum / samples.length)
  const seed = hashDoppelgangerSeed(samples.map(sampleKey).join('|'))

  return {
    hue: (seed % 360 + CHANNEL_IDS.indexOf(dominantChannel) * 72) % 360,
    breathHz: Number((0.08 + 0.24 * clamp01(traits[0]!.weight)).toFixed(4)),
    orbitRadiusM: Number((1.2 + 2.4 * complexity).toFixed(3)),
    complexity: Number(complexity.toFixed(4)),
    luminance: Number((0.3 + 0.45 * (1 - complexity)).toFixed(4)),
    satellites: 3 + Math.round(complexity * 9),
    dominantChannel,
    traits,
    descriptorLabel: DESCRIPTORS[dominantChannel].en,
    descriptorLabelIt: DESCRIPTORS[dominantChannel].it,
  }
}

export function communicationChannelLabel(channel: CommunicationChannel, lang: 'it' | 'en'): string {
  const definition = COMMUNICATION_CHANNELS.find((item) => item.id === channel)
  if (!definition) throw new Error(`Unknown communication channel: ${channel}`)
  return lang === 'it' ? definition.labelIt : definition.label
}
