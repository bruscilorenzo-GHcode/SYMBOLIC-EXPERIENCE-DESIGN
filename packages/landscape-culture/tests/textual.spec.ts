import { describe, expect, it } from 'vitest'
import {
  GIARDINO_SONORO_DEMO,
  buildMetaCompositionRequest,
  detectTheme,
  ruleBasedMetaComposer,
  synthesizeTextualMetaComposition,
  validateMetaCompositionDraft,
  type MetaComposerClient,
  type MetaCompositionDraft,
} from '../src'

const scenario = GIARDINO_SONORO_DEMO
const request = buildMetaCompositionRequest(
  scenario.textualInputs,
  scenario.zones,
  scenario.policy,
  { dataOntologyId: 'musico.data-to-music.v1', dataOntologyNote: 'MUSI-CO DATA to MUSIC · Mindkestra-compatible' },
)

describe('LLM textual meta-composition', () => {
  it('builds a constrained request with zones and the DATA→MUSIC ontology', () => {
    expect(request.protocol).toBe('aura.text-to-meta.v1')
    expect(request.prompt).toContain('zone-grove')
    expect(request.prompt).toContain('zone-river')
    expect(request.prompt).toContain('musico.data-to-music.v1')
    expect(request.prompt).toContain('Do not invent zones')
    expect(request.prompt).toContain('text-1')
    expect(request.prompt).toContain('text-2')
    expect(request.inputs).toHaveLength(2)
  })

  it('produces a valid deterministic fallback that represents every input', () => {
    const draft = ruleBasedMetaComposer(request)
    expect(validateMetaCompositionDraft(draft, request)).toEqual([])
    expect(draft.attribution.map((entry) => entry.inputId).sort()).toEqual(['text-1', 'text-2'])
    expect(draft.zones).toHaveLength(3)
    expect(draft.zones.flatMap((zone) => zone.layers).length).toBeGreaterThanOrEqual(3)
    expect(ruleBasedMetaComposer(request)).toEqual(draft)
  })

  it('accepts a valid LLM composition without falling back', async () => {
    const valid = ruleBasedMetaComposer(request)
    const client: MetaComposerClient = { compose: async () => valid }
    const result = await synthesizeTextualMetaComposition(request, client)
    expect(result.source).toBe('llm')
    expect(result.issues).toEqual([])
    expect(result.draft.attribution).toHaveLength(2)
  })

  it('rejects an LLM draft that drops a visitor input', async () => {
    const valid = ruleBasedMetaComposer(request)
    const invalid: MetaCompositionDraft = { ...valid, attribution: [] }
    const client: MetaComposerClient = { compose: async () => invalid }
    const result = await synthesizeTextualMetaComposition(request, client)
    expect(result.source).toBe('rules')
    expect(result.issues.some((issue) => issue.includes('missing from attribution'))).toBe(true)
    expect(result.draft).toEqual(ruleBasedMetaComposer(request))
  })

  it('rejects unknown zones, channel overflow and density overload', () => {
    const valid = ruleBasedMetaComposer(request)
    const invalid: MetaCompositionDraft = {
      ...valid,
      zones: [
        {
          ...valid.zones[0]!,
          zoneId: 'zone-invented',
          channelStart: 9,
          channelCount: 4,
          layers: [
            ...valid.zones[0]!.layers.map((layer) => ({
              ...layer,
              descriptor: { ...layer.descriptor, density: 1 },
              channel: 14,
            })),
            ...valid.zones[0]!.layers.map((layer) => ({
              ...layer,
              id: `${layer.id}-duplicate`,
              descriptor: { ...layer.descriptor, density: 1 },
              channel: 15,
            })),
          ],
        },
      ],
    }
    const issues = validateMetaCompositionDraft(invalid, request)
    expect(issues.some((issue) => issue.includes('Unknown zone'))).toBe(true)
    expect(issues.some((issue) => issue.includes('exceeds the channel budget'))).toBe(true)
    expect(issues.some((issue) => issue.includes('channel 14'))).toBe(true)
    expect(issues.some((issue) => issue.includes('density'))).toBe(true)
  })

  it('falls back when the LLM call fails', async () => {
    const client: MetaComposerClient = {
      compose: async () => {
        throw new Error('provider timeout')
      },
    }
    const result = await synthesizeTextualMetaComposition(request, client)
    expect(result.source).toBe('rules')
    expect(result.issues[0]).toContain('provider timeout')
    expect(validateMetaCompositionDraft(result.draft, request)).toEqual([])
  })

  it('detects landscape themes across languages', () => {
    expect(detectTheme('the river is dark').id).toBe('water')
    expect(detectTheme('il fiume scorre').id).toBe('water')
    expect(detectTheme('a stone wall and a bell').id).toBe('stone')
    expect(detectTheme('wind in the trees').id).toBe('air')
    expect(detectTheme('nothing recognisable').id).toBe('forest')
  })
})
