/**
 * METAPLACE — concept and design DNA by Lorenzo Brusci.
 *
 * A hybrid, immersive place operating 24/7 where a person is assisted to
 * "become more": a club, a physical and spiritual rehab, an art atelier, an
 * intimate theatre. Everything starts from a declared Performing Wish; the
 * System composes an Improvement Plan, assistants emerge from the complexity
 * and duration of the training, and each completed session leaves a trace.
 *
 * The engine is pure and deterministic: same input, same output. It is
 * advisory — the System proposes, the person decides — and it never collects
 * real biometrics: every profile value is a simulated declaration.
 */

export type Lang = 'it' | 'en'
export type TraditionId = 'bar' | 'rehab' | 'atelier'
export type FieldId = 'meditation' | 'revalidation' | 'sport' | 'metacognition' | 'arts' | 'food'
export type MediumId = 'dance' | 'music' | 'image' | 'sport' | 'voice' | 'form' | 'imaginal'
export type AudienceId = 'self' | 'circle' | 'crowd' | 'unlimited'
export type TraceKind = 'work' | 'experience' | 'relation'
export type PlanTier = 'threshold' | 'cycle' | 'metamorphosis'
export type MoreId = 'health' | 'energy' | 'creative' | 'networks' | 'intelligence' | 'social' | 'fantasy'
export type PhaseId = 'threshold' | 'immersion' | 'rehearsal' | 'performance' | 'trace'
export type AssistantId =
  | 'host'
  | 'choreographer'
  | 'essence'
  | 'soundscape'
  | 'voice'
  | 'director'
  | 'coach'
  | 'guide'
  | 'chef'
  | 'synthetic'
  | 'doppelganger'
export type VenueId = 'healing-room' | 'stage' | 'atelier' | 'arena' | 'virtual' | 'table'

export interface Bilingual {
  it: string
  en: string
}

export function pick(text: Bilingual, lang: Lang): string {
  return lang === 'it' ? text.it : text.en
}

/* ------------------------------------------------------------------ */
/* Deterministic helpers                                               */
/* ------------------------------------------------------------------ */

export function fnv1a(input: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function round(value: number, digits = 3): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

/* ------------------------------------------------------------------ */
/* Vocabulary                                                          */
/* ------------------------------------------------------------------ */

export const TRADITIONS: Array<{ id: TraditionId; label: Bilingual; gesture: Bilingual; hue: number }> = [
  {
    id: 'bar',
    label: { it: 'Music bar', en: 'Music bar' },
    gesture: {
      it: 'Esibirsi: esplorazione, esposizione di sé, ricompense di attenzione, senza danneggiarsi.',
      en: 'Exhibiting: exploration, self-exposure, rewards of attention, without self-damage.',
    },
    hue: 18,
  },
  {
    id: 'rehab',
    label: { it: 'Rehab & sport', en: 'Rehab & sport' },
    gesture: {
      it: 'Intensificarsi: trattamento personalizzato, guarigione, processi energizzanti.',
      en: 'Intensifying: personalised treatment, healing, energising processes.',
    },
    hue: 96,
  },
  {
    id: 'atelier',
    label: { it: 'Atelier d’arte', en: 'Art atelier' },
    gesture: {
      it: 'Lasciare tracce: espressione di sé, il presente intensificato, l’io simbolico co-creato.',
      en: 'Leaving traces: self-expression, the intensified present, the co-created symbolic self.',
    },
    hue: 222,
  },
]

export const FIELDS: Array<{ id: FieldId; label: Bilingual; hue: number }> = [
  { id: 'meditation', label: { it: 'Meditazione', en: 'Meditation' }, hue: 196 },
  { id: 'revalidation', label: { it: 'Rivalidazione', en: 'Revalidation' }, hue: 150 },
  { id: 'sport', label: { it: 'Efficienza sportiva', en: 'Sport efficiency' }, hue: 84 },
  { id: 'metacognition', label: { it: 'Metacognizione e psicologia', en: 'Metacognition & psychology' }, hue: 268 },
  { id: 'arts', label: { it: 'Tutte le arti', en: 'All arts' }, hue: 330 },
  { id: 'food', label: { it: 'Cibo strategico', en: 'Strategic food' }, hue: 32 },
]

export const MORE: Array<{ id: MoreId; label: Bilingual }> = [
  { id: 'health', label: { it: 'Più salute', en: 'More health' } },
  { id: 'energy', label: { it: 'Più energia costruttiva', en: 'More constructive energy' } },
  { id: 'creative', label: { it: 'Più potere creativo', en: 'More creative power' } },
  { id: 'networks', label: { it: 'Più reti collaborative', en: 'More collaborative networks' } },
  { id: 'intelligence', label: { it: 'Più intelligenza individuale e comune', en: 'More individual & common intelligence' } },
  { id: 'social', label: { it: 'Più capacità di bene sociale', en: 'More social good capacity' } },
  { id: 'fantasy', label: { it: 'Più fantasia', en: 'More fantasy' } },
]

export const MEDIA: Record<MediumId, Bilingual> = {
  dance: { it: 'danza', en: 'dance' },
  music: { it: 'musica', en: 'music' },
  image: { it: 'immagine e film', en: 'image & film' },
  sport: { it: 'sport', en: 'sport' },
  voice: { it: 'voce e parola', en: 'voice & word' },
  form: { it: 'forma durevole', en: 'lasting form' },
  imaginal: { it: 'immaginario', en: 'imaginal' },
}

export const AUDIENCES: Record<AudienceId, Bilingual> = {
  self: { it: 'per sé', en: 'for oneself' },
  circle: { it: 'cerchio ristretto', en: 'small circle' },
  crowd: { it: 'grande pubblico', en: 'large audience' },
  unlimited: { it: 'pubblico illimitato', en: 'unlimited audience' },
}

export const TRACE_KINDS: Record<TraceKind, Bilingual> = {
  work: { it: 'opera che resta', en: 'a work that stays' },
  experience: { it: 'esperienza vissuta', en: 'a lived experience' },
  relation: { it: 'relazione', en: 'a relation' },
}

export const PLAN_TIERS: Array<{ id: PlanTier; sessions: number; label: Bilingual; summary: Bilingual }> = [
  {
    id: 'threshold',
    sessions: 4,
    label: { it: 'Soglia', en: 'Threshold' },
    summary: { it: '4 sessioni: provare il Wish, una prima traccia.', en: '4 sessions: try the Wish, a first trace.' },
  },
  {
    id: 'cycle',
    sessions: 8,
    label: { it: 'Ciclo', en: 'Cycle' },
    summary: { it: '8 sessioni: allenare, provare in pubblico, consolidare.', en: '8 sessions: train, rehearse in public, consolidate.' },
  },
  {
    id: 'metamorphosis',
    sessions: 12,
    label: { it: 'Metamorfosi', en: 'Metamorphosis' },
    summary: { it: '12 sessioni: ogni sessione ti cambia, il nuovo stato si padroneggia.', en: '12 sessions: each session changes you, the new state is mastered.' },
  },
]

export const PHASES: Record<PhaseId, Bilingual> = {
  threshold: { it: 'Soglia', en: 'Threshold' },
  immersion: { it: 'Immersione', en: 'Immersion' },
  rehearsal: { it: 'Prova', en: 'Rehearsal' },
  performance: { it: 'Performance', en: 'Performance' },
  trace: { it: 'Traccia', en: 'Trace' },
}

export const VENUES: Record<VenueId, Bilingual> = {
  'healing-room': { it: 'Healing Room', en: 'Healing Room' },
  stage: { it: 'Palco del club', en: 'Club stage' },
  atelier: { it: 'Atelier', en: 'Atelier' },
  arena: { it: 'Arena di allenamento', en: 'Training arena' },
  virtual: { it: 'Guscio virtuale (VR/AR)', en: 'Virtual shell (VR/AR)' },
  table: { it: 'Tavola strategica', en: 'Strategic table' },
}

export const ASSISTANTS: Record<AssistantId, { label: Bilingual; role: Bilingual }> = {
  host: {
    label: { it: 'Operatore d’accoglienza', en: 'Host operator' },
    role: { it: 'Accoglie e raccoglie il Performing Wish.', en: 'Welcomes and gathers the Performing Wish.' },
  },
  choreographer: {
    label: { it: 'Coreografo fisico', en: 'Physical choreographer' },
    role: { it: 'Guida il corpo: il gomito che fa male oscilla come piume.', en: 'Guides the body: the aching elbow oscillates like feathers.' },
  },
  essence: {
    label: { it: 'Essence designer', en: 'Essence designer' },
    role: { it: 'Patch virtuale: compone odori da un ricordo.', en: 'Virtual patch: composes scents from a memory.' },
  },
  soundscape: {
    label: { it: 'Compositore di paesaggi sonori', en: 'Soundscape composer' },
    role: { it: 'Mari, lagune, gabbiani come flauti solisti su cui la voce si innesta.', en: 'Seas, lagoons, gulls as solo flutes the voice can graft onto.' },
  },
  voice: {
    label: { it: 'Coach della voce', en: 'Voice coach' },
    role: { it: 'Dà forma al suono come a un dipinto.', en: 'Shapes sound as one shapes a painting.' },
  },
  director: {
    label: { it: 'Regia', en: 'Director' },
    role: { it: 'Inquadra il Wish come scena, ripresa, montaggio.', en: 'Frames the Wish as scene, take and cut.' },
  },
  coach: {
    label: { it: 'Coach di performance', en: 'Performance coach' },
    role: { it: 'Porta oltre i limiti sportivi, con reversibilità.', en: 'Takes you past sport limits, reversibly.' },
  },
  guide: {
    label: { it: 'Persona guida (Cicerone)', en: 'Guide persona (Cicerone)' },
    role: { it: 'Psicologo, terapista o coach, potenziato da un compagno AI.', en: 'Psychologist, therapist or coach, augmented by an AI companion.' },
  },
  chef: {
    label: { it: 'Cuoco strategico', en: 'Strategic cook' },
    role: { it: 'Il cibo come parte del processo, non come premio.', en: 'Food as part of the process, not as reward.' },
  },
  synthetic: {
    label: { it: 'Sintetico umano', en: 'Human synthetic' },
    role: { it: 'Ispeziona le soluzioni personalizzate e il loro tempo.', en: 'Inspects personalised solutions and their timing.' },
  },
  doppelganger: {
    label: { it: 'Doppelgänger relazionale', en: 'Relational doppelgänger' },
    role: { it: 'Dalla Healing Room: il gemello di dati come compagno del processo.', en: 'From the Healing Room: the data twin as companion of the process.' },
  },
}

/* ------------------------------------------------------------------ */
/* Performing Wish                                                     */
/* ------------------------------------------------------------------ */

export interface WishSpec {
  text: string
  medium: MediumId
  audience: AudienceId
  trace: TraceKind
  /** Normalised tradition weights suggested by the wish (sum = 1). */
  affinity: Record<TraditionId, number>
  matched: string[]
  /** 0..1 — how much of the wish the classifier recognised. */
  confidence: number
  hue: number
}

const MEDIUM_WORDS: Record<MediumId, string[]> = {
  dance: ['ball', 'danz', 'danc', 'corpo', 'body', 'coreograf', 'choreo', 'mov'],
  music: ['music', 'suon', 'play', 'cant', 'sing', 'concert', 'band', 'compo', 'dj', 'pian', 'chitarr', 'guitar'],
  image: ['film', 'video', 'dirig', 'direct', 'regia', 'foto', 'photo', 'cinema', 'dipin', 'paint', 'immagin', 'image'],
  sport: ['sport', 'corr', 'run', 'nuot', 'swim', 'limit', 'atlet', 'athlet', 'marat', 'allen', 'train', 'forza', 'strength'],
  voice: ['voce', 'voice', 'parl', 'speak', 'poes', 'poet', 'racont', 'story', 'leggere', 'read'],
  form: ['forma', 'shape', 'per sempre', 'forever', 'scolp', 'sculpt', 'costru', 'build', 'oggett', 'object', 'opera', 'resti', 'last'],
  imaginal: ['fantas', 'sogn', 'dream', 'immagina', 'imagin', 'visione', 'vision', 'virtual', 'stato', 'state'],
}

const AUDIENCE_WORDS: Record<AudienceId, string[]> = {
  self: ['me stess', 'myself', 'da sol', 'alone', 'per me', 'for me', 'intim'],
  circle: ['amic', 'friend', 'famigli', 'family', 'pochi', 'few', 'piccol', 'small', 'ristrett', 'circle'],
  crowd: ['1000', 'mille', 'pubblico', 'audience', 'folla', 'crowd', 'grande', 'large', 'teatro', 'theatre', 'stadio'],
  unlimited: ['illimitat', 'unlimited', 'mondo', 'world', 'tutti', 'everyone', 'online', 'stream'],
}

const TRACE_WORDS: Record<TraceKind, string[]> = {
  work: ['per sempre', 'forever', 'rest', 'last', 'opera', 'work', 'forma', 'shape', 'film', 'disco', 'record'],
  relation: ['insieme', 'together', 'con ', 'with ', 'amic', 'friend', 'gruppo', 'group', 'altri', 'others'],
  experience: ['provare', 'feel', 'sentire', 'vivere', 'live', 'superare', 'overcome', 'stato', 'state'],
}

const MEDIUM_AFFINITY: Record<MediumId, Record<TraditionId, number>> = {
  dance: { bar: 0.45, rehab: 0.35, atelier: 0.2 },
  music: { bar: 0.55, rehab: 0.1, atelier: 0.35 },
  image: { bar: 0.2, rehab: 0.1, atelier: 0.7 },
  sport: { bar: 0.1, rehab: 0.8, atelier: 0.1 },
  voice: { bar: 0.4, rehab: 0.2, atelier: 0.4 },
  form: { bar: 0.05, rehab: 0.15, atelier: 0.8 },
  imaginal: { bar: 0.3, rehab: 0.3, atelier: 0.4 },
}

function countHits(text: string, words: string[]): string[] {
  return words.filter((word) => text.includes(word))
}

function argmax<K extends string>(scores: Record<K, number>, order: K[], fallback: K): K {
  let best = fallback
  let bestScore = 0
  for (const key of order) {
    if (scores[key] > bestScore) {
      best = key
      bestScore = scores[key]
    }
  }
  return best
}

export function parseWish(raw: string): WishSpec {
  const text = raw.trim()
  const lower = ` ${text.toLowerCase()} `
  const matched: string[] = []

  const mediumOrder: MediumId[] = ['dance', 'music', 'image', 'sport', 'voice', 'form', 'imaginal']
  const mediumScores = {} as Record<MediumId, number>
  for (const id of mediumOrder) {
    const hits = countHits(lower, MEDIUM_WORDS[id])
    mediumScores[id] = hits.length
    matched.push(...hits)
  }
  const audienceOrder: AudienceId[] = ['unlimited', 'crowd', 'circle', 'self']
  const audienceScores = {} as Record<AudienceId, number>
  for (const id of audienceOrder) {
    const hits = countHits(lower, AUDIENCE_WORDS[id])
    audienceScores[id] = hits.length
    matched.push(...hits)
  }
  const traceOrder: TraceKind[] = ['work', 'relation', 'experience']
  const traceScores = {} as Record<TraceKind, number>
  for (const id of traceOrder) traceScores[id] = countHits(lower, TRACE_WORDS[id]).length

  const medium = argmax(mediumScores, mediumOrder, 'imaginal')
  const audience = argmax(audienceScores, audienceOrder, 'self')
  const trace = argmax(traceScores, traceOrder, 'experience')
  const unique = [...new Set(matched)]
  const confidence = text.length === 0 ? 0 : clamp01(unique.length / 4)

  return {
    text,
    medium,
    audience,
    trace,
    affinity: { ...MEDIUM_AFFINITY[medium] },
    matched: unique,
    confidence: round(confidence, 2),
    hue: fnv1a(text.toLowerCase() || 'metaplace') % 360,
  }
}

export const WISH_EXAMPLES: Bilingual[] = [
  { it: 'Voglio ballare per 1000 persone', en: 'I want to dance for 1000 people' },
  { it: 'Dare forma a qualcosa che resti per sempre', en: 'Shape something that lasts forever' },
  { it: 'Suonare musica per un pubblico illimitato', en: 'Perform music for an unlimited audience' },
  { it: 'Dirigere un film con i miei amici', en: 'Direct a film with my friends' },
  { it: 'Superare i miei limiti sportivi', en: 'Overcome my sport limits' },
  { it: 'Riequilibrare la mia fantasia e padroneggiare un nuovo stato', en: 'Rebalance my fantasy and master a new state' },
]

/* ------------------------------------------------------------------ */
/* Modulation                                                          */
/* ------------------------------------------------------------------ */

export interface Modulation {
  /** Weights of the three traditions; normalised by the engine. */
  traditions: Record<TraditionId, number>
  /** 0 = individual, 1 = group (VR / AR technologies). */
  group: number
  /** 0 = physical, 1 = virtual (economic and strategic factors). */
  virtual: number
}

export interface ModulationReadout {
  traditions: Record<TraditionId, number>
  group: number
  virtual: number
  /** 0..1 — overall degree of interaction between the three components (normalised entropy). */
  interaction: number
  dominant: TraditionId
}

export function normaliseTraditions(weights: Record<TraditionId, number>): Record<TraditionId, number> {
  const bar = Math.max(0, weights.bar)
  const rehab = Math.max(0, weights.rehab)
  const atelier = Math.max(0, weights.atelier)
  const sum = bar + rehab + atelier
  if (sum <= 0) return { bar: 1 / 3, rehab: 1 / 3, atelier: 1 / 3 }
  return { bar: round(bar / sum, 4), rehab: round(rehab / sum, 4), atelier: round(atelier / sum, 4) }
}

export function readModulation(modulation: Modulation): ModulationReadout {
  const traditions = normaliseTraditions(modulation.traditions)
  const values = [traditions.bar, traditions.rehab, traditions.atelier]
  const entropy = -values.reduce((acc, value) => (value > 0 ? acc + value * Math.log(value) : acc), 0)
  const interaction = clamp01(entropy / Math.log(3))
  const dominant = (['bar', 'rehab', 'atelier'] as TraditionId[]).reduce((best, id) =>
    traditions[id] > traditions[best] ? id : best,
  )
  return {
    traditions,
    group: clamp01(modulation.group),
    virtual: clamp01(modulation.virtual),
    interaction: round(interaction, 3),
    dominant,
  }
}

export function modulationFromWish(wish: WishSpec): Modulation {
  const groupByAudience: Record<AudienceId, number> = { self: 0.15, circle: 0.4, crowd: 0.75, unlimited: 0.9 }
  return {
    traditions: { ...wish.affinity },
    group: groupByAudience[wish.audience],
    virtual: wish.audience === 'unlimited' || wish.medium === 'imaginal' ? 0.65 : 0.3,
  }
}

/* ------------------------------------------------------------------ */
/* Healing Room link                                                   */
/* ------------------------------------------------------------------ */

/** Minimal summary of a configured Healing Room used as a station of the plan. */
export interface HealingRoomLink {
  name: string
  soundModules: number
  objects: number
  light: string
}

/* ------------------------------------------------------------------ */
/* Improvement plan                                                    */
/* ------------------------------------------------------------------ */

export interface ImprovementSession {
  index: number
  phase: PhaseId
  field: FieldId
  venue: VenueId
  minutes: number
  assistants: AssistantId[]
  /** 0..1 intensity curve across the plan. */
  intensity: number
  shell: 'physical' | 'virtual'
}

export interface EmergingAssistant {
  id: AssistantId
  shell: 'physical' | 'virtual'
  hue: number
  /** Session index at which the assistant emerges. */
  emergesAt: number
}

export interface ImprovementPlan {
  id: string
  tier: PlanTier
  wish: WishSpec
  modulation: ModulationReadout
  fieldWeights: Record<FieldId, number>
  activeFields: FieldId[]
  sessions: ImprovementSession[]
  assistants: EmergingAssistant[]
  more: Record<MoreId, number>
  totalMinutes: number
}

export function fieldWeights(wish: WishSpec, mod: ModulationReadout): Record<FieldId, number> {
  const { bar, rehab, atelier } = mod.traditions
  const isMedium = (...ids: MediumId[]): number => (ids.includes(wish.medium) ? 1 : 0)
  const raw: Record<FieldId, number> = {
    meditation: 0.18 + rehab * 0.35 + atelier * 0.15 + (1 - mod.group) * 0.25 + isMedium('imaginal') * 0.3,
    revalidation: 0.1 + rehab * 0.7 + isMedium('sport', 'dance') * 0.25,
    sport: 0.05 + rehab * 0.45 + isMedium('sport') * 0.6 + isMedium('dance') * 0.3,
    metacognition: 0.15 + atelier * 0.25 + rehab * 0.2 + mod.interaction * 0.25 + isMedium('voice', 'imaginal') * 0.2,
    arts: 0.1 + atelier * 0.6 + bar * 0.4 + isMedium('music', 'image', 'dance', 'form', 'voice') * 0.4,
    food: 0.1 + rehab * 0.25 + bar * 0.3 + mod.group * 0.1,
  }
  const sum = Object.values(raw).reduce((acc, value) => acc + value, 0)
  const out = {} as Record<FieldId, number>
  for (const field of FIELDS) out[field.id] = round(raw[field.id] / sum, 4)
  return out
}

function phaseFor(index: number, total: number): PhaseId {
  if (index === 0) return 'threshold'
  if (index === total - 1) return 'trace'
  if (index === total - 2) return 'performance'
  const ratio = index / (total - 1)
  return ratio < 0.5 ? 'immersion' : 'rehearsal'
}

/** Largest-remainder apportionment of sessions to fields, then interleaved. */
function apportion(fields: FieldId[], weights: Record<FieldId, number>, slots: number): FieldId[] {
  if (fields.length === 0 || slots <= 0) return []
  const sum = fields.reduce((acc, id) => acc + weights[id], 0) || 1
  const quotas = fields.map((id) => ({ id, exact: (weights[id] / sum) * slots }))
  const counts = new Map<FieldId, number>(quotas.map((q) => [q.id, Math.floor(q.exact)]))
  let assigned = [...counts.values()].reduce((a, b) => a + b, 0)
  const byRemainder = [...quotas].sort((a, b) => b.exact - Math.floor(b.exact) - (a.exact - Math.floor(a.exact)) || weights[b.id] - weights[a.id])
  let cursor = 0
  while (assigned < slots) {
    const id = byRemainder[cursor % byRemainder.length]!.id
    counts.set(id, (counts.get(id) ?? 0) + 1)
    assigned += 1
    cursor += 1
  }
  const ordered = [...fields].sort((a, b) => weights[b] - weights[a])
  const result: FieldId[] = []
  while (result.length < slots) {
    for (const id of ordered) {
      const left = counts.get(id) ?? 0
      if (left > 0 && result.length < slots) {
        result.push(id)
        counts.set(id, left - 1)
      }
    }
  }
  return result
}

function venueFor(field: FieldId, phase: PhaseId, mod: ModulationReadout, healing: HealingRoomLink | null, seed: number): VenueId {
  if (phase === 'performance') return mod.virtual > 0.6 ? 'virtual' : mod.dominant === 'atelier' ? 'atelier' : 'stage'
  if ((field === 'meditation' || field === 'revalidation') && healing) return 'healing-room'
  if (mod.virtual > 0.7 && seed % 3 === 0) return 'virtual'
  switch (field) {
    case 'meditation':
    case 'revalidation':
      return 'healing-room'
    case 'sport':
      return 'arena'
    case 'arts':
      return mod.traditions.bar > mod.traditions.atelier ? 'stage' : 'atelier'
    case 'food':
      return 'table'
    default:
      return mod.virtual > 0.5 ? 'virtual' : 'atelier'
  }
}

function assistantsFor(field: FieldId, phase: PhaseId, wish: WishSpec, mod: ModulationReadout, index: number, total: number, healing: HealingRoomLink | null): AssistantId[] {
  const list = new Set<AssistantId>()
  if (index === 0) list.add('host')
  const byField: Record<FieldId, AssistantId[]> = {
    meditation: ['soundscape', 'essence'],
    revalidation: ['choreographer'],
    sport: ['coach', 'choreographer'],
    metacognition: ['guide'],
    arts: wish.medium === 'image' ? ['director'] : wish.medium === 'voice' || wish.medium === 'music' ? ['voice', 'soundscape'] : ['choreographer', 'soundscape'],
    food: ['chef'],
  }
  for (const id of byField[field]) list.add(id)
  if (phase === 'performance') {
    if (wish.medium === 'dance') list.add('choreographer')
    if (wish.medium === 'music' || wish.medium === 'voice') list.add('voice')
    if (wish.medium === 'image') list.add('director')
    list.add('soundscape')
  }
  // Assistants emerge with the complexity and time of the training.
  if (total >= 8 && index >= Math.floor(total / 2) && (mod.virtual > 0.45 || index === total - 2)) list.add('synthetic')
  if (healing && (field === 'meditation' || field === 'metacognition') && index > 0) list.add('doppelganger')
  return [...list]
}

export function composePlan(
  wish: WishSpec,
  modulation: Modulation,
  tier: PlanTier,
  options: { disabledFields?: FieldId[]; healing?: HealingRoomLink | null } = {},
): ImprovementPlan {
  const mod = readModulation(modulation)
  const weights = fieldWeights(wish, mod)
  const disabled = new Set(options.disabledFields ?? [])
  const healing = options.healing ?? null
  const tierSpec = PLAN_TIERS.find((item) => item.id === tier) ?? PLAN_TIERS[0]!
  const total = tierSpec.sessions
  const topCount = total <= 4 ? 3 : total <= 8 ? 4 : 6
  const activeFields = FIELDS.map((f) => f.id)
    .filter((id) => !disabled.has(id))
    .sort((a, b) => weights[b] - weights[a])
    .slice(0, topCount)
  const fallback: FieldId[] = activeFields.length > 0 ? activeFields : ['meditation']

  // The threshold and the trace are shaped by the strongest field; the middle is apportioned.
  const middle = apportion(fallback, weights, Math.max(0, total - 2))
  const fieldsSeq: FieldId[] = [fallback[0]!, ...middle, fallback[0]!].slice(0, total)
  // The performance enacts the Wish itself, in the field of its medium.
  const performanceField: FieldId =
    wish.medium === 'sport' ? 'sport' : wish.medium === 'imaginal' ? 'metacognition' : 'arts'
  if (total >= 3 && !disabled.has(performanceField)) fieldsSeq[total - 2] = performanceField

  const seedBase = fnv1a(`${wish.text}|${tier}|${mod.traditions.bar}|${mod.traditions.rehab}|${mod.group}|${mod.virtual}`)
  const sessions: ImprovementSession[] = fieldsSeq.map((field, index) => {
    const phase = phaseFor(index, total)
    const seed = (seedBase + index * 2654435761) >>> 0
    const intensity = round(clamp01(0.25 + 0.6 * Math.sin((Math.PI * (index + 0.5)) / total) + (phase === 'performance' ? 0.2 : 0)), 2)
    const venue = venueFor(field, phase, mod, healing, seed)
    const virtualShell = venue === 'virtual' || (mod.virtual > 0.5 && seed % 100 < mod.virtual * 70)
    const minutes = phase === 'threshold' ? 45 : phase === 'performance' ? 90 + Math.round(mod.group * 60) : phase === 'trace' ? 30 : 50 + (seed % 4) * 10
    return {
      index,
      phase,
      field,
      venue,
      minutes,
      assistants: assistantsFor(field, phase, wish, mod, index, total, healing),
      intensity,
      shell: virtualShell ? 'virtual' : 'physical',
    }
  })

  const seen = new Map<AssistantId, EmergingAssistant>()
  for (const session of sessions) {
    for (const id of session.assistants) {
      if (seen.has(id)) continue
      const hash = fnv1a(`${id}|${wish.hue}`)
      const shell: 'physical' | 'virtual' =
        id === 'host' ? 'physical' : id === 'synthetic' || id === 'doppelganger' ? 'virtual' : (hash % 100) / 100 < mod.virtual ? 'virtual' : 'physical'
      seen.set(id, { id, shell, hue: (wish.hue + (hash % 140)) % 360, emergesAt: session.index })
    }
  }

  const fieldShare = (id: FieldId): number => sessions.filter((s) => s.field === id).length / total
  const depth = total / 12
  const more: Record<MoreId, number> = {
    health: round(clamp01(0.2 + fieldShare('revalidation') * 0.9 + fieldShare('meditation') * 0.6 + fieldShare('food') * 0.5 + depth * 0.2)),
    energy: round(clamp01(0.2 + fieldShare('sport') * 0.9 + mod.traditions.bar * 0.4 + depth * 0.2)),
    creative: round(clamp01(0.2 + fieldShare('arts') * 1.1 + mod.traditions.atelier * 0.3 + depth * 0.2)),
    networks: round(clamp01(0.1 + mod.group * 0.7 + mod.interaction * 0.2)),
    intelligence: round(clamp01(0.2 + fieldShare('metacognition') * 1.1 + mod.interaction * 0.3 + depth * 0.15)),
    social: round(clamp01(0.1 + mod.group * 0.5 + (wish.audience === 'unlimited' || wish.audience === 'crowd' ? 0.25 : 0) + depth * 0.15)),
    fantasy: round(clamp01(0.25 + mod.virtual * 0.45 + (wish.medium === 'imaginal' ? 0.25 : 0) + fieldShare('arts') * 0.3)),
  }

  return {
    id: `mp-${seedBase.toString(36)}`,
    tier,
    wish,
    modulation: mod,
    fieldWeights: weights,
    activeFields: fallback,
    sessions,
    assistants: [...seen.values()].sort((a, b) => a.emergesAt - b.emergesAt),
    more,
    totalMinutes: sessions.reduce((acc, s) => acc + s.minutes, 0),
  }
}

/* ------------------------------------------------------------------ */
/* Traces                                                              */
/* ------------------------------------------------------------------ */

export interface Trace {
  id: string
  planId: string
  session: number
  field: FieldId
  kind: TraceKind
  hue: number
  /** Caller-supplied epoch ms; the engine stays clock-free. */
  at: number
}

/** Append-only: a trace never overwrites another one. */
export function depositTrace(traces: Trace[], plan: ImprovementPlan, sessionIndex: number, at: number): Trace[] {
  const session = plan.sessions[sessionIndex]
  if (!session) return traces
  if (traces.some((trace) => trace.planId === plan.id && trace.session === sessionIndex)) return traces
  const field = FIELDS.find((f) => f.id === session.field)!
  const trace: Trace = {
    id: `tr-${plan.id}-${sessionIndex}`,
    planId: plan.id,
    session: sessionIndex,
    field: session.field,
    kind: session.phase === 'performance' || session.phase === 'trace' ? plan.wish.trace : 'experience',
    hue: (field.hue + plan.wish.hue) % 360,
    at,
  }
  return [...traces, trace]
}

export const METAPLACE_STORAGE_KEY = 'mas.metaplace.v1'
