import { clamp01 } from './states'
import type { CommunicationChannel, DoppelgangerSpec, HealingGoalSpec } from './types'

interface GoalSeed {
  title: string
  titleIt: string
  mantra: string
  mantraIt: string
  form: HealingGoalSpec['artifact']['form']
}

const GOAL_SEEDS: Record<CommunicationChannel, GoalSeed> = {
  self: {
    title: 'Still Water',
    titleIt: 'Acqua ferma',
    mantra: 'One thought, held gently.',
    mantraIt: 'Un solo pensiero, retto con delicatezza.',
    form: 'lotus',
  },
  twin: {
    title: 'Clear Signal',
    titleIt: 'Segnale nitido',
    mantra: 'The body agrees with the mind.',
    mantraIt: 'Il corpo è d’accordo con la mente.',
    form: 'orb',
  },
  others: {
    title: 'Shared Room',
    titleIt: 'Stanza condivisa',
    mantra: 'You are not alone in here.',
    mantraIt: 'Qui non sei da solo.',
    form: 'lattice',
  },
  artefacts: {
    title: 'Kept Story',
    titleIt: 'Storia custodita',
    mantra: 'What you love keeps you alive.',
    mantraIt: 'Ciò che ami ti tiene vivo.',
    form: 'monolith',
  },
}

/**
 * Materialises the healing goal in the middle of the focus area.
 * The goal appears only as concentration deepens past the focused-mind
 * threshold (0.55) and is fully present exactly when the empty mind begins
 * (0.85), where the session heals.
 */
export function materialiseHealingGoal(
  doppelganger: DoppelgangerSpec | null,
  focus: number,
): HealingGoalSpec | null {
  if (!doppelganger) return null
  const clampedFocus = clamp01(focus)
  if (clampedFocus < 0.55) return null

  const seed = GOAL_SEEDS[doppelganger.dominantChannel]
  const materialisation = clamp01((clampedFocus - 0.55) / 0.3)
  const depth = doppelganger.complexity

  return {
    id: `goal-${doppelganger.dominantChannel}`,
    title: seed.title,
    titleIt: seed.titleIt,
    mantra: seed.mantra,
    mantraIt: seed.mantraIt,
    materialisation: Number(materialisation.toFixed(4)),
    artifact: {
      form: seed.form,
      heightM: Number((0.9 + 1.3 * depth).toFixed(3)),
      radiusM: Number((0.35 + 0.45 * depth).toFixed(3)),
      hue: (doppelganger.hue + 180) % 360,
      rotationHz: Number((0.02 + 0.05 * (1 - depth)).toFixed(4)),
    },
  }
}
