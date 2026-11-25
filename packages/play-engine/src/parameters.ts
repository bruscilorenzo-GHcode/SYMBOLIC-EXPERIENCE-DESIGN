import type {
  PlayGestureDefinition,
  PlayGestureId,
  PlayMaterialDefinition,
  PlayMaterialId,
  PlayParameterDefinition,
  PlayParameterId,
  PlayParameters,
  PlayPalette,
  PlayRenderModeDefinition,
  PlayRenderModeId,
  PlaySeason,
  SeasonPhase,
} from './types'

export const PLAY_PARAMETER_IDS: PlayParameterId[] = [
  'canopy',
  'water',
  'stone',
  'light',
  'guests',
  'season',
  'wind',
]

export const PLAY_PARAMETERS: PlayParameterDefinition[] = [
  {
    id: 'canopy',
    label: 'Corona',
    italian: 'Corona',
    english: 'Canopy',
    lowLabel: 'cielo aperto',
    highLabel: 'volta viva',
    hint: 'Foglie, ombra, assorbimento: la corona costruisce il soffitto del giardino.',
    min: 0,
    max: 1,
    step: 0.01,
    hue: 132,
  },
  {
    id: 'water',
    label: 'Rivo',
    italian: 'Rivo',
    english: 'Water',
    lowLabel: 'pietra asciutta',
    highLabel: 'acqua che parla',
    hint: 'Il rivo apre il suolo, riflette la luce e aggiunge una voce liquida.',
    min: 0,
    max: 1,
    step: 0.01,
    hue: 191,
  },
  {
    id: 'stone',
    label: 'Pietra',
    italian: 'Pietra',
    english: 'Stone',
    lowLabel: 'terra morbida',
    highLabel: 'geologia',
    hint: 'La pietra dà corpo, riflessione e una memoria lunga al suono.',
    min: 0,
    max: 1,
    step: 0.01,
    hue: 36,
  },
  {
    id: 'light',
    label: 'Luce',
    italian: 'Luce',
    english: 'Light',
    lowLabel: 'ombra',
    highLabel: 'meriggio',
    hint: 'La luce decide il colore armonico, le lanterne e il volo del polline.',
    min: 0,
    max: 1,
    step: 0.01,
    hue: 47,
  },
  {
    id: 'guests',
    label: 'Ospiti',
    italian: 'Ospiti',
    english: 'Guests',
    lowLabel: 'solo',
    highLabel: 'coro',
    hint: 'Ogni ospite porta un motivo; più voci chiedono una soglia condivisa.',
    min: 0,
    max: 1,
    step: 0.01,
    hue: 283,
  },
  {
    id: 'season',
    label: 'Stagione',
    italian: 'Stagione',
    english: 'Season',
    lowLabel: 'risveglio',
    highLabel: 'riposo',
    hint: 'La stagione cambia foglie, temperatura, tempo e densità del giardino.',
    min: 0,
    max: 1,
    step: 0.01,
    hue: 97,
  },
  {
    id: 'wind',
    label: 'Vento',
    italian: 'Vento',
    english: 'Wind',
    lowLabel: 'quiete',
    highLabel: 'fruscio',
    hint: 'Il vento muove la scena, disperde le particelle e scolpisce il rumore.',
    min: 0,
    max: 1,
    step: 0.01,
    hue: 166,
  },
]

export const DEFAULT_PLAY_PARAMETERS: PlayParameters = {
  canopy: 0.56,
  water: 0.44,
  stone: 0.34,
  light: 0.78,
  guests: 0.28,
  season: 0.38,
  wind: 0.26,
}

export const PLAY_GESTURES: PlayGestureDefinition[] = [
  {
    id: 'rugiada',
    label: 'Rugiada',
    italian: 'Rugiada',
    description: 'La notte lascia acqua sulle foglie: il rivo si allarga, la luce torna bassa.',
    requiresCompletions: 0,
    deltas: { water: 0.12, light: 0.04, canopy: 0.03, wind: -0.03 },
  },
  {
    id: 'potatura',
    label: 'Potatura',
    italian: 'Potatura',
    description: 'Aprire la corona per far entrare il cielo e il vento.',
    requiresCompletions: 0,
    deltas: { canopy: -0.16, light: 0.11, wind: 0.06, stone: 0.03 },
  },
  {
    id: 'soglia',
    label: 'Soglia',
    italian: 'Soglia',
    description: 'Una soglia di pietra invita gli ospiti a entrare senza perdere il centro.',
    requiresCompletions: 1,
    deltas: { stone: 0.1, guests: 0.14, canopy: -0.05, light: 0.04 },
  },
  {
    id: 'sospensione',
    label: 'Sospensione',
    italian: 'Sospensione',
    description: 'Il giardino trattiene il respiro: meno folla, più ombra, più ascolto.',
    requiresCompletions: 2,
    deltas: { guests: -0.22, wind: -0.12, canopy: 0.06, water: 0.03 },
  },
  {
    id: 'risonanza',
    label: 'Risonanza',
    italian: 'Risonanza',
    description: 'La pietra cede all’acqua e il giardino comincia a cantare.',
    requiresCompletions: 3,
    deltas: { stone: -0.1, water: 0.1, light: 0.08, wind: 0.04 },
  },
  {
    id: 'fioritura',
    label: 'Fioritura',
    italian: 'Fioritura',
    description: 'Una stagione intera passa in un gesto: il colore cambia e il tempo accelera.',
    requiresCompletions: 6,
    deltas: { season: 0.2, water: 0.04, light: 0.06, guests: 0.04 },
  },
]

export const PLAY_MATERIALS: PlayMaterialDefinition[] = [
  { id: 'terra', label: 'Terra', italian: 'Terra', requiresCompletions: 0 },
  { id: 'acqua', label: 'Acqua', italian: 'Acqua', requiresCompletions: 0 },
  { id: 'pietra', label: 'Pietra', italian: 'Pietra', requiresCompletions: 0 },
  { id: 'legno', label: 'Legno', italian: 'Legno', requiresCompletions: 0 },
  { id: 'foglia', label: 'Foglia', italian: 'Foglia', requiresCompletions: 0 },
  { id: 'ferro', label: 'Ferro', italian: 'Ferro', requiresCompletions: 1 },
  { id: 'vetro', label: 'Vetro', italian: 'Vetro', requiresCompletions: 2 },
  { id: 'specchio', label: 'Specchio', italian: 'Specchio', requiresCompletions: 3 },
]

const DAY_PALETTE: PlayPalette = {
  skyTop: '#122d3c',
  skyHorizon: '#9bcfbd',
  sun: '#f6d28c',
  ground: '#274937',
  groundShadow: '#0c1c18',
  water: '#2d8da4',
  waterGlow: '#8de7d7',
  foliage: '#8ebd70',
  stone: '#7b7c70',
  pollen: '#eaffc4',
  visitor: '#e5b8ff',
  glow: '#ffd48f',
  fog: '#0a1a20',
}

export const PLAY_RENDER_MODES: PlayRenderModeDefinition[] = [
  {
    id: 'diurno',
    label: 'Diurno',
    italian: 'Diurno',
    description: 'Il giardino nel suo respiro quotidiano.',
    requiresCompletions: 0,
    palette: DAY_PALETTE,
    particleBias: 1,
    glowBias: 0.7,
  },
  {
    id: 'polline',
    label: 'Polline',
    italian: 'Polline',
    description: 'Una nuvola dorata rende visibile il movimento del vento.',
    requiresCompletions: 1,
    palette: {
      ...DAY_PALETTE,
      skyTop: '#182b3d',
      skyHorizon: '#d8c58d',
      sun: '#ffd36b',
      pollen: '#ffe7a8',
      glow: '#ffde9a',
    },
    particleBias: 2.1,
    glowBias: 0.9,
  },
  {
    id: 'notturno',
    label: 'Notturno',
    italian: 'Notturno',
    description: 'Lucciole, superfici fredde, una luce che ascolta.',
    requiresCompletions: 2,
    palette: {
      skyTop: '#050b16',
      skyHorizon: '#183246',
      sun: '#9ad9d0',
      ground: '#102421',
      groundShadow: '#020709',
      water: '#154e66',
      waterGlow: '#65d7d1',
      foliage: '#4b7b68',
      stone: '#4d555b',
      pollen: '#8cf4dd',
      visitor: '#d3a6ff',
      glow: '#9de9ff',
      fog: '#03080e',
    },
    particleBias: 1.2,
    glowBias: 1.4,
  },
  {
    id: 'aurora',
    label: 'Aurora',
    italian: 'Aurora',
    description: 'Il cielo diventa un altro strato del giardino.',
    requiresCompletions: 3,
    palette: {
      skyTop: '#07172b',
      skyHorizon: '#6cd5c9',
      sun: '#ffd3e1',
      ground: '#19372e',
      groundShadow: '#050d10',
      water: '#287c8d',
      waterGlow: '#b6fff1',
      foliage: '#7ac49e',
      stone: '#7b8e8e',
      pollen: '#dcfff3',
      visitor: '#ffb8df',
      glow: '#c7fff5',
      fog: '#061217',
    },
    particleBias: 1.5,
    glowBias: 1.6,
  },
  {
    id: 'pioggia',
    label: 'Pioggia',
    italian: 'Pioggia',
    description: 'L’acqua sale dal rivo e tutto il giardino diventa superficie.',
    requiresCompletions: 4,
    palette: {
      ...DAY_PALETTE,
      skyTop: '#172a2e',
      skyHorizon: '#7b9e9b',
      sun: '#d2e1d4',
      ground: '#1d382e',
      water: '#2b7986',
      waterGlow: '#b7f5ea',
      foliage: '#6ca477',
      stone: '#687579',
      pollen: '#c9f3e7',
      glow: '#b9e9e2',
      fog: '#0a1719',
    },
    particleBias: 1.1,
    glowBias: 1.1,
  },
  {
    id: 'sciame',
    label: 'Sciame',
    italian: 'Sciame',
    description: 'La materia si organizza in un coro di punti luminosi.',
    requiresCompletions: 6,
    palette: {
      ...DAY_PALETTE,
      skyTop: '#10162c',
      skyHorizon: '#e8a9bf',
      sun: '#ffe7bb',
      ground: '#2a2d3d',
      water: '#3e6b8f',
      waterGlow: '#ffd9e8',
      foliage: '#9bbd8e',
      stone: '#8c8492',
      pollen: '#fff0b8',
      visitor: '#ffc2e2',
      glow: '#ffe0ad',
      fog: '#0b0e1b',
    },
    particleBias: 2.6,
    glowBias: 1.7,
  },
]

export function isPlayParameterId(value: string): value is PlayParameterId {
  return PLAY_PARAMETER_IDS.includes(value as PlayParameterId)
}

export function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

export function roundUnit(value: number): number {
  return Math.round(clampUnit(value) * 100) / 100
}

export function normalizePlayParameters(
  input: Partial<Record<PlayParameterId, number>>,
): PlayParameters {
  const result = { ...DEFAULT_PLAY_PARAMETERS }
  for (const id of PLAY_PARAMETER_IDS) {
    const value = input[id]
    if (typeof value === 'number' && Number.isFinite(value)) result[id] = roundUnit(value)
  }
  return result
}

export function setPlayParameter(
  parameters: PlayParameters,
  id: PlayParameterId,
  value: number,
): PlayParameters {
  return normalizePlayParameters({ ...parameters, [id]: value })
}

export function getGesture(id: PlayGestureId): PlayGestureDefinition {
  const gesture = PLAY_GESTURES.find((item) => item.id === id)
  if (!gesture) throw new Error(`Unknown play gesture "${id}"`)
  return gesture
}

export function applyGesture(parameters: PlayParameters, id: PlayGestureId): PlayParameters {
  const gesture = getGesture(id)
  const next: Partial<Record<PlayParameterId, number>> = { ...parameters }
  for (const [key, delta] of Object.entries(gesture.deltas)) {
    const parameterId = key as PlayParameterId
    next[parameterId] = (parameters[parameterId] ?? 0) + (delta ?? 0)
  }
  return normalizePlayParameters(next)
}

export function getRenderMode(id: PlayRenderModeId): PlayRenderModeDefinition {
  const mode = PLAY_RENDER_MODES.find((item) => item.id === id)
  if (!mode) throw new Error(`Unknown play render mode "${id}"`)
  return mode
}

export function getMaterial(id: PlayMaterialId): PlayMaterialDefinition {
  const material = PLAY_MATERIALS.find((item) => item.id === id)
  if (!material) throw new Error(`Unknown play material "${id}"`)
  return material
}

export function seasonFromValue(value: number): PlaySeason {
  const t = clampUnit(value)
  let phase: SeasonPhase
  let label: string
  if (t < 0.2) {
    phase = 'risveglio'
    label = 'Risveglio'
  } else if (t < 0.45) {
    phase = 'fioritura'
    label = 'Fioritura'
  } else if (t < 0.7) {
    phase = 'maturita'
    label = 'Maturità'
  } else if (t < 0.88) {
    phase = 'caduta'
    label = 'Caduta'
  } else {
    phase = 'riposo'
    label = 'Riposo'
  }
  const leafFactor =
    phase === 'riposo' ? 0.32 : phase === 'caduta' ? 0.62 : phase === 'risveglio' ? 0.72 : 1
  return {
    value: t,
    phase,
    label,
    temperatureC: 6 + Math.sin(t * Math.PI) * 20 - (phase === 'riposo' ? 1 : 0),
    leafFactor,
    bloom: Math.max(0, Math.sin((t - 0.16) * Math.PI * 2)) * (t < 0.58 ? 1 : 0.35),
    paletteShift: t,
  }
}

export function describeParameter(id: PlayParameterId, value: number): string {
  const definition = PLAY_PARAMETERS.find((item) => item.id === id)
  if (!definition) return ''
  if (value < 0.33) return definition.lowLabel
  if (value > 0.67) return definition.highLabel
  return `${definition.lowLabel} → ${definition.highLabel}`
}

export function parameterVocabulary(parameters: PlayParameters): string {
  const dominant = [...PLAY_PARAMETER_IDS]
    .map((id) => ({ id, distance: Math.abs(parameters[id] - 0.5) }))
    .sort((a, b) => b.distance - a.distance)[0]
  if (!dominant) return 'giardino in ascolto'
  return describeParameter(dominant.id, parameters[dominant.id])
}


const RENDER_MODE_ENGLISH: Record<PlayRenderModeId, string> = {
  diurno: 'Day',
  polline: 'Pollen',
  notturno: 'Night',
  aurora: 'Aurora',
  pioggia: 'Rain',
  sciame: 'Swarm',
}

export function playRenderModeLabel(
  mode: Pick<PlayRenderModeDefinition, 'id' | 'italian'>,
  lang: 'it' | 'en' = 'it',
): string {
  return lang === 'it' ? mode.italian : (RENDER_MODE_ENGLISH[mode.id] ?? mode.italian)
}
