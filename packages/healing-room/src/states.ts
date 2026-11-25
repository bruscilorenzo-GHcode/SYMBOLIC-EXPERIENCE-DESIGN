import type { HealingSoundbed, MindStateDefinition, MindStateId } from './types'

/**
 * The meditation ladder from the brief: the everyday state exposed to stimulus
 * relaxes into the observing mind, concentrates into the focused mind and heals
 * into the empty mind.
 */
export const MIND_STATES: MindStateDefinition[] = [
  {
    id: 'everyday',
    label: 'Everyday state — observing mind',
    labelIt: 'Stato quotidiano — mente osservante',
    threshold: 0,
    guidance:
      'Stimuli come and go; the never-resting mind is exposed but starts watching them as a viewer.',
    guidanceIt:
      'Gli stimoli vanno e vengono; la mente mai ferma è esposta, ma comincia a guardarli da spettatore.',
  },
  {
    id: 'observing',
    label: 'Observing mind',
    labelIt: 'Mente osservante',
    threshold: 0.25,
    guidance:
      'Stimuli are now exhibitions: the diagnostic gallery reads the visitor while the visitor reads the data.',
    guidanceIt:
      'Gli stimoli diventano esposizioni: la galleria diagnostica legge il visitatore mentre il visitatore legge i dati.',
  },
  {
    id: 'focused',
    label: 'Focused mind — concentration',
    labelIt: 'Mente focalizzata — concentrazione',
    threshold: 0.55,
    guidance:
      'Uninterrupted mind. The focus area admits the visitor; external patterns indicate progress or regress of deep concentration.',
    guidanceIt:
      'Mente senza interruzioni. L’area focus ammette il visitatore; i pattern esterni indicano progresso o regresso della concentrazione profonda.',
  },
  {
    id: 'empty',
    label: 'Empty mind — relaxation, healing',
    labelIt: 'Mente vuota — rilassamento, guarigione',
    threshold: 0.85,
    guidance:
      'The healing goal is fully materialised at the centre; the doppelgänger breathes with the visitor and the session heals.',
    guidanceIt:
      'L’obiettivo di guarigione è pienamente materializzato al centro; il doppelgänger respira con il visitatore e la sessione guarisce.',
  },
]

export function mindStateFromFocus(focus: number): MindStateId {
  const clamped = clamp01(focus)
  let current: MindStateId = 'everyday'
  for (const state of MIND_STATES) {
    if (clamped >= state.threshold) current = state.id
  }
  return current
}

export function mindStateDefinition(id: MindStateId): MindStateDefinition {
  const state = MIND_STATES.find((item) => item.id === id)
  if (!state) throw new Error(`Unknown mind state: ${id}`)
  return state
}

/** Deterministic focus accumulation with hard 0..1 clamp. */
export function advanceFocus(focus: number, delta: number): number {
  return clamp01(focus + delta)
}

/** Suggested soundbed parameters for a mind state; the app voices them locally. */
export function soundbedForMindState(id: MindStateId): HealingSoundbed {
  const soundbeds: Record<MindStateId, HealingSoundbed> = {
    everyday: { droneHz: 110, tempoBpm: 66, density: 0.7, brightness: 0.6, breathSeconds: 4 },
    observing: { droneHz: 98, tempoBpm: 58, density: 0.45, brightness: 0.45, breathSeconds: 5 },
    focused: { droneHz: 87.31, tempoBpm: 50, density: 0.25, brightness: 0.3, breathSeconds: 6.5 },
    empty: { droneHz: 73.42, tempoBpm: 44, density: 0.12, brightness: 0.2, breathSeconds: 8 },
  }
  return soundbeds[id]
}

export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.min(1, Math.max(0, value))
}
