import { PLAY_GESTURES, PLAY_MATERIALS, PLAY_RENDER_MODES } from './parameters'
import type {
  PlayGestureId,
  PlayMaterialId,
  PlayProgression,
  PlayRenderModeId,
} from './types'

export interface PlaySpeciesUnlock {
  id: string
  commonName: string
  requiresCompletions: number
}

/**
 * A small, authored subset of the landscape palette. The base set already
 * covers all five strata and all three foliage sizes, so a new player can make
 * an ecologically complete garden; progression adds more colour and habitat.
 */
export const PLAY_SPECIES: PlaySpeciesUnlock[] = [
  { id: 'pachysandra-terminalis', commonName: 'Pachysandra', requiresCompletions: 0 },
  { id: 'liriope-muscari', commonName: 'Liriope', requiresCompletions: 0 },
  { id: 'viburnum-tinus', commonName: 'Viburno', requiresCompletions: 0 },
  { id: 'laurus-nobilis', commonName: 'Alloro', requiresCompletions: 0 },
  { id: 'hydrangea-macrophylla', commonName: 'Ortensia', requiresCompletions: 0 },
  { id: 'acer-palmatum', commonName: 'Acero', requiresCompletions: 0 },
  { id: 'olea-europaea', commonName: 'Olivo', requiresCompletions: 0 },
  { id: 'quercus-ilex', commonName: 'Leccio', requiresCompletions: 0 },
  { id: 'thymus-serpyllum', commonName: 'Timo', requiresCompletions: 1 },
  { id: 'cercis-siliquastrum', commonName: 'Siliquastro', requiresCompletions: 1 },
  { id: 'magnolia-grandiflora', commonName: 'Magnolia', requiresCompletions: 2 },
  { id: 'tilia-cordata', commonName: 'Tiglio', requiresCompletions: 2 },
  { id: 'platanus-acerifolia', commonName: 'Platano', requiresCompletions: 4 },
]

export interface PlayStage {
  index: number
  title: string
  threshold: number
  line: string
}

export const PLAY_STAGES: PlayStage[] = [
  { index: 0, title: 'Seme', threshold: 0, line: 'Il giardino è ancora una promessa.' },
  { index: 1, title: 'Risveglio', threshold: 1, line: 'La prima voce trova il suo posto.' },
  { index: 2, title: 'Radura', threshold: 2, line: 'Lo spazio comincia a rispondere.' },
  { index: 3, title: 'Coro', threshold: 3, line: 'Più presenze, una sola respirazione.' },
  { index: 4, title: 'Rifugio', threshold: 4, line: 'Il giardino sa nascondere e mostrare.' },
  { index: 5, title: 'Costellazione', threshold: 6, line: 'Ogni gesto chiama tutte le altre specie.' },
]

export function getPlayProgression(completedMissionIds: readonly string[]): PlayProgression {
  const completedCount = new Set(completedMissionIds).size
  const stage =
    [...PLAY_STAGES].reverse().find((candidate) => completedCount >= candidate.threshold) ?? PLAY_STAGES[0]!
  const next = PLAY_STAGES.find((candidate) => candidate.threshold > completedCount) ?? null
  const unlockedSpeciesIds = PLAY_SPECIES.filter(
    (species) => completedCount >= species.requiresCompletions,
  ).map((species) => species.id)
  const unlockedMaterialIds = PLAY_MATERIALS.filter(
    (material) => completedCount >= material.requiresCompletions,
  ).map((material) => material.id)
  const unlockedRenderModeIds = PLAY_RENDER_MODES.filter(
    (mode) => completedCount >= mode.requiresCompletions,
  ).map((mode) => mode.id)
  const unlockedGestureIds = PLAY_GESTURES.filter(
    (gesture) => completedCount >= gesture.requiresCompletions,
  ).map((gesture) => gesture.id)

  return {
    completedCount,
    stage: stage.index,
    title: stage.title,
    nextTitle: next?.title ?? null,
    nextThreshold: next?.threshold ?? null,
    unlockedSpeciesIds,
    unlockedMaterialIds,
    unlockedRenderModeIds,
    unlockedGestureIds,
  }
}

export function isSpeciesUnlocked(speciesId: string, completedMissionIds: readonly string[]): boolean {
  const species = PLAY_SPECIES.find((item) => item.id === speciesId)
  if (!species) return false
  return new Set(completedMissionIds).size >= species.requiresCompletions
}

export function isGestureUnlocked(id: PlayGestureId, completedMissionIds: readonly string[]): boolean {
  const gesture = PLAY_GESTURES.find((item) => item.id === id)
  return gesture ? new Set(completedMissionIds).size >= gesture.requiresCompletions : false
}

export function isRenderModeUnlocked(
  id: PlayRenderModeId,
  completedMissionIds: readonly string[],
): boolean {
  const mode = PLAY_RENDER_MODES.find((item) => item.id === id)
  return mode ? new Set(completedMissionIds).size >= mode.requiresCompletions : false
}

export function isMaterialUnlocked(id: PlayMaterialId, completedMissionIds: readonly string[]): boolean {
  const material = PLAY_MATERIALS.find((item) => item.id === id)
  return material ? new Set(completedMissionIds).size >= material.requiresCompletions : false
}

export function nextUnlockHint(completedMissionIds: readonly string[]): string {
  const progression = getPlayProgression(completedMissionIds)
  if (!progression.nextTitle) return 'Ogni specie è sbloccata. Il giardino può cambiare ancora.'
  const nextCount = progression.nextThreshold ?? progression.completedCount + 1
  return `Ancora ${Math.max(1, nextCount - progression.completedCount)} missione(i) per «${progression.nextTitle}».`
}
