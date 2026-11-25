import type { CoexistencePolicy, MixRole } from './orchestration'
import type { LandscapeZone } from './landscape-types'
import type { Mode, MusicalDescriptor, Register, Timbre } from './music'
import { DEFAULT_DESCRIPTOR, MODES, clamp, clamp01, descriptorLabel, validateDescriptor } from './music'

export type MetaSource = 'text' | 'landscape' | 'data' | 'ai' | 'visitor'

export interface TextualVisitorInput {
  id: string
  visitorId: string
  zoneId: string
  text: string
  language?: string
  priority?: number
}

export interface MetaLayer {
  id: string
  zoneId: string
  source: MetaSource
  inputId?: string
  descriptor: MusicalDescriptor
  role: MixRole
  gainDb: number
  channel: number
  spatialization: 'object' | 'hoa' | 'vbap' | 'dbap'
  rationale: string
}

export interface MetaZone {
  zoneId: string
  channelStart: number
  channelCount: number
  descriptor: MusicalDescriptor
  layers: MetaLayer[]
}

export interface MetaCompositionDraft {
  protocol: 'aura.meta-composition.v1'
  title: string
  narrative: string
  globalDescriptor: MusicalDescriptor
  zones: MetaZone[]
  attribution: { inputId: string; visitorId: string; contribution: string }[]
}

export interface MetaCompositionRequest {
  protocol: 'aura.text-to-meta.v1'
  system: string
  prompt: string
  inputs: TextualVisitorInput[]
  zones: LandscapeZone[]
  policy: CoexistencePolicy
  landscape: {
    palette: string[]
    dataOntologyId: string
    dataOntologyNote: string
  }
  responseContract: {
    title: 'string'
    narrative: 'string'
    globalDescriptor: 'MusicalDescriptor'
    zones: 'MetaZone[]'
    attribution: '{ inputId, visitorId, contribution }[]'
  }
}

export interface MetaComposerClient {
  compose(request: MetaCompositionRequest): Promise<MetaCompositionDraft>
}

export interface TextualCompositionResult {
  draft: MetaCompositionDraft
  source: 'llm' | 'rules'
  issues: string[]
}

interface Theme {
  id: string
  terms: string[]
  mode: Mode
  timbre: Timbre
  register: Register
  density: number
  brightness: number
  roughness: number
}

const THEMES: Theme[] = [
  {
    id: 'water',
    terms: ['water', 'river', 'rain', 'tide', 'flow', 'acqua', 'fiume', 'pioggia'],
    mode: 'dorian',
    timbre: 'fluid',
    register: 'mid',
    density: 0.45,
    brightness: 0.55,
    roughness: 0.25,
  },
  {
    id: 'stone',
    terms: ['stone', 'rock', 'wall', 'pietra', 'muro', 'roccia'],
    mode: 'phrygian',
    timbre: 'stone',
    register: 'low',
    density: 0.35,
    brightness: 0.3,
    roughness: 0.55,
  },
  {
    id: 'air',
    terms: ['air', 'wind', 'sky', 'vento', 'aria', 'cielo'],
    mode: 'lydian',
    timbre: 'airy',
    register: 'high',
    density: 0.3,
    brightness: 0.8,
    roughness: 0.15,
  },
  {
    id: 'metal',
    terms: ['bell', 'metal', 'bronze', 'campana', 'metallo', 'bronzo'],
    mode: 'mixolydian',
    timbre: 'metallic',
    register: 'high',
    density: 0.5,
    brightness: 0.75,
    roughness: 0.4,
  },
  {
    id: 'voice',
    terms: ['voice', 'sing', 'choir', 'voce', 'canto', 'coro'],
    mode: 'aeolian',
    timbre: 'vocal',
    register: 'mid',
    density: 0.5,
    brightness: 0.5,
    roughness: 0.3,
  },
  {
    id: 'forest',
    terms: ['forest', 'tree', 'leaf', 'bosco', 'albero', 'foglia'],
    mode: 'ionian',
    timbre: 'woody',
    register: 'mid',
    density: 0.55,
    brightness: 0.45,
    roughness: 0.35,
  },
]

/**
 * Builds the request for an LLM meta-composer. The LLM is allowed to propose a
 * musical synthesis, but it may not invent zones, exceed the channel budget, or
 * drop a visitor input. Validation happens outside the model.
 */
export function buildMetaCompositionRequest(
  inputs: readonly TextualVisitorInput[],
  zones: readonly LandscapeZone[],
  policy: CoexistencePolicy,
  options: {
    palette?: string[]
    dataOntologyId?: string
    dataOntologyNote?: string
  } = {},
): MetaCompositionRequest {
  const palette = options.palette ?? ['ground-cover', 'shrub', 'small-tree', 'medium-tree', 'large-tree']
  const dataOntologyId = options.dataOntologyId ?? 'musico.data-to-music.v1'
  const dataOntologyNote =
    options.dataOntologyNote ??
    'MUSI-CO DATA to MUSIC cross-ontology, Mindkestra-compatible: environmental metrics become musical controls, not literal data streams.'

  const prompt = [
    'You are the meta-composer for a landscape sound installation.',
    'Synthesize the visitors’ textual inputs into one coherent multichannel meta-composition.',
    'Use a Syntagma-derived zone model: each zone has an independent channel span and a shared tonal/temporal field.',
    'Preserve every visitor input in the attribution list. Do not invent zones or channels.',
    `Available zones: ${zones.map((zone) => `${zone.id} (${zone.name}, ${zone.channelStart}–${zone.channelStart + zone.channelCount - 1}, ${zone.kind})`).join('; ')}`,
    `Hard limits: ${policy.channelCount} channels; max density ${policy.maxDensity}; tempo drift ±${policy.maxTempoDriftPct}%; transposition ±${policy.maxTranspositionSemitones} semitones.`,
    `Landscape strata: ${palette.join(', ')}.`,
    `Data ontology: ${dataOntologyId} — ${dataOntologyNote}`,
    'Inputs:',
    ...inputs.map((input) => `- [${input.id}] zone=${input.zoneId} visitor=${input.visitorId}: ${input.text}`),
    'Return JSON that matches the response contract. Keep the narrative concise and technical.',
  ].join('\n')

  return {
    protocol: 'aura.text-to-meta.v1',
    system:
      'You are an expert in modal composition, spatial audio, landscape architecture and ecological dramaturgy. You compose with zones, not with a single stereo bus.',
    prompt,
    inputs: [...inputs],
    zones: [...zones],
    policy,
    landscape: { palette, dataOntologyId, dataOntologyNote },
    responseContract: {
      title: 'string',
      narrative: 'string',
      globalDescriptor: 'MusicalDescriptor',
      zones: 'MetaZone[]',
      attribution: '{ inputId, visitorId, contribution }[]',
    },
  }
}

/**
 * Deterministic fallback. It is also the reference implementation used by the
 * tests, so the LLM has a musical baseline it must improve rather than replace.
 */
export function ruleBasedMetaComposer(request: MetaCompositionRequest): MetaCompositionDraft {
  const themes = request.inputs.map((input) => ({ input, theme: detectTheme(input.text) }))
  const primary = themes[0]?.theme ?? THEMES.find((theme) => theme.id === 'forest')!
  const seed = hashText(request.inputs.map((input) => input.text).join('|'))
  const globalDescriptor: MusicalDescriptor = {
    ...DEFAULT_DESCRIPTOR,
    tonicPc: seed % 12,
    mode: primary.mode,
    tempoBpm: 56 + (seed % 40),
    density: clamp01(themes.reduce((sum, item) => sum + item.theme.density, 0) / Math.max(1, themes.length)),
    brightness: clamp01(themes.reduce((sum, item) => sum + item.theme.brightness, 0) / Math.max(1, themes.length)),
    roughness: clamp01(themes.reduce((sum, item) => sum + item.theme.roughness, 0) / Math.max(1, themes.length)),
    timbre: primary.timbre,
  }

  const zoneList = request.zones.length > 0 ? request.zones : [defaultZone()]
  const zoneDrafts: MetaZone[] = zoneList.map((zone, zoneIndex) => {
    const zoneThemes = themes.filter((item) => item.input.zoneId === zone.id)
    const layers: MetaLayer[] = []
    const sourceThemes = zoneThemes.length > 0 ? zoneThemes : [{ input: undefined, theme: primary }]

    sourceThemes.forEach((item, index) => {
      const role: MixRole = index === 0 ? 'lead' : 'support'
      const descriptor = descriptorForTheme(item.theme, globalDescriptor, index)
      layers.push({
        id: `${zone.id}-layer-${index + 1}`,
        zoneId: zone.id,
        source: item.input ? 'text' : 'landscape',
        inputId: item.input?.id,
        descriptor,
        role,
        gainDb: role === 'lead' ? 0 : -3,
        channel: zone.channelStart + (index % Math.max(1, zone.channelCount)),
        spatialization: zone.kind === 'river' ? 'hoa' : 'vbap',
        rationale: item.input
          ? `${item.theme.id} imagery from ${item.input.id} (${descriptorLabel(descriptor)})`
          : `Landscape bed for ${zone.name}`,
      })
    })

    return {
      zoneId: zone.id,
      channelStart: zone.channelStart,
      channelCount: zone.channelCount,
      descriptor: globalDescriptor,
      layers,
    }
  })

  const attribution = themes.map(({ input, theme }) => ({
    inputId: input.id,
    visitorId: input.visitorId,
    contribution: `${theme.id} imagery · ${theme.mode} · ${theme.timbre}`,
  }))

  return {
    protocol: 'aura.meta-composition.v1',
    title: `Landscape meta-composition: ${[...new Set(themes.map((item) => item.theme.id))].join(' / ')}`,
    narrative: `A Syntagma-derived multichannel synthesis of ${request.inputs.length} visitor inputs across ${zoneList.length} zones, with ${request.landscape.dataOntologyId} available for environmental reactivity.`,
    globalDescriptor,
    zones: zoneDrafts,
    attribution,
  }
}

export async function synthesizeTextualMetaComposition(
  request: MetaCompositionRequest,
  client: MetaComposerClient,
): Promise<TextualCompositionResult> {
  try {
    const draft = await client.compose(request)
    const issues = validateMetaCompositionDraft(draft, request)
    if (issues.length === 0) return { draft, source: 'llm', issues: [] }
    return { draft: ruleBasedMetaComposer(request), source: 'rules', issues }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      draft: ruleBasedMetaComposer(request),
      source: 'rules',
      issues: [`LLM composer failed: ${message}`],
    }
  }
}

export function validateMetaCompositionDraft(
  draft: MetaCompositionDraft,
  request: MetaCompositionRequest,
): string[] {
  const issues: string[] = []
  if (draft.protocol !== 'aura.meta-composition.v1') issues.push('Unexpected meta-composition protocol')
  if (!draft.title.trim()) issues.push('Missing title')
  if (!draft.narrative.trim()) issues.push('Missing narrative')
  issues.push(...validateDescriptor(draft.globalDescriptor).map((issue) => `globalDescriptor: ${issue}`))

  const knownZones = new Map(request.zones.map((zone) => [zone.id, zone]))
  const seenZones = new Set<string>()
  for (const zone of draft.zones) {
    if (!knownZones.has(zone.zoneId)) issues.push(`Unknown zone "${zone.zoneId}"`)
    if (seenZones.has(zone.zoneId)) issues.push(`Duplicate zone "${zone.zoneId}"`)
    seenZones.add(zone.zoneId)
    if (zone.channelStart < 0 || zone.channelStart + zone.channelCount > request.policy.channelCount) {
      issues.push(`Zone "${zone.zoneId}" exceeds the channel budget`)
    }
    if (zone.layers.length === 0) issues.push(`Zone "${zone.zoneId}" has no layers`)
    const channels = new Set<number>()
    for (const layer of zone.layers) {
      if (channels.has(layer.channel)) issues.push(`${layer.id}: duplicate channel ${layer.channel} in ${zone.zoneId}`)
      channels.add(layer.channel)
    }
    const density = zone.layers.reduce((sum, layer) => sum + layer.descriptor.density, 0)
    if (density > request.policy.maxDensity + 1e-6) {
      issues.push(`Zone "${zone.zoneId}" density ${density.toFixed(2)} exceeds ${request.policy.maxDensity}`)
    }
    for (const layer of zone.layers) {
      issues.push(...validateDescriptor(layer.descriptor).map((issue) => `${layer.id}: ${issue}`))
      if (layer.channel < zone.channelStart || layer.channel >= zone.channelStart + zone.channelCount) {
        issues.push(`${layer.id}: channel ${layer.channel} outside ${zone.zoneId}`)
      }
      if (layer.inputId && !request.inputs.some((input) => input.id === layer.inputId)) {
        issues.push(`${layer.id}: unknown inputId "${layer.inputId}"`)
      }
    }
  }

  const attributed = new Set(draft.attribution.map((entry) => entry.inputId))
  const layeredInputs = new Set(
    draft.zones.flatMap((zone) =>
      zone.layers.map((layer) => layer.inputId).filter((id): id is string => Boolean(id)),
    ),
  )
  for (const input of request.inputs) {
    if (!attributed.has(input.id)) issues.push(`Input "${input.id}" is missing from attribution`)
    if (!layeredInputs.has(input.id)) issues.push(`Input "${input.id}" is not represented by a layer`)
  }
  for (const entry of draft.attribution) {
    if (!request.inputs.some((input) => input.id === entry.inputId)) {
      issues.push(`Attribution references unknown input "${entry.inputId}"`)
    }
  }

  return [...new Set(issues)]
}

export function detectTheme(text: string): Theme {
  const normalized = text.toLowerCase()
  let best = THEMES[THEMES.length - 1]!
  let bestScore = 0
  for (const theme of THEMES) {
    const score = theme.terms.reduce(
      (sum, term) => sum + (normalized.includes(term) ? 1 : 0),
      0,
    )
    if (score > bestScore) {
      best = theme
      bestScore = score
    }
  }
  return best
}

function descriptorForTheme(
  theme: Theme,
  global: MusicalDescriptor,
  index: number,
): MusicalDescriptor {
  return {
    ...global,
    tonicPc: (global.tonicPc + index * 5) % 12,
    mode: theme.mode,
    register: theme.register,
    density: clamp(theme.density, 0, 1),
    brightness: clamp(theme.brightness, 0, 1),
    roughness: clamp(theme.roughness, 0, 1),
    timbre: theme.timbre,
  }
}

function defaultZone(): LandscapeZone {
  return {
    id: 'zone-default',
    name: 'Default zone',
    kind: 'courtyard',
    channelStart: 0,
    channelCount: 2,
    exposure: 'outdoor',
    areaM2: 100,
  }
}

function hashText(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function modeFromIndex(index: number): Mode {
  return MODES[((Math.round(index) % MODES.length) + MODES.length) % MODES.length] ?? 'dorian'
}
