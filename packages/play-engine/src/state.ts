import { applyGesture, DEFAULT_PLAY_PARAMETERS, normalizePlayParameters, seasonFromValue, setPlayParameter } from './parameters'
import { composePlay, type ComposeOptions } from './derive'
import {
  evaluateAllMissions,
  evaluateMission,
  firstIncompleteMission,
  missionById,
  missionUnlocked,
} from './missions'
import { getPlayProgression } from './progression'
import {
  addPlayObject,
  defaultPlayObjects,
  ensurePlayObjectMode,
  isPlayObjectKind,
  isPlayObjectMode,
  normalizePlayObject,
  removePlayObject,
  updatePlayObject,
} from './objects'
import { DEFAULT_HABITAT_ID, getHabitatArchetype } from '@aura-spec/inhabiting-model'
import { DEFAULT_IDIOM_ID, getIdiom } from './idioms'
import { DEFAULT_SPEAKER_PERSONA_ID, getPersona } from '@aura-spec/inhabiting-model'
import type {
  PlayComposition,
  PlayGestureId,
  PlayObjectKind,
  PlayObjectMode,
  PlayObjectSpec,
  PlayProgress,
  PlayRenderModeId,
  PlayTick,
} from './types'

export const PLAY_STORAGE_KEY = 'aura-spec.play.session.v1'

export function createInitialPlayProgress(): PlayProgress {
  return {
    schemaVersion: 1,
    habitatId: DEFAULT_HABITAT_ID,
    idiomId: DEFAULT_IDIOM_ID,
    parameters: { ...DEFAULT_PLAY_PARAMETERS },
    activeMissionId: firstIncompleteMission([]).id,
    completedMissionIds: [],
    renderMode: 'diurno',
    lastGesture: null,
    applied: false,
    objectMode: 'landscape',
    objects: defaultPlayObjects('landscape'),
  }
}

export function resetPlayProgress(): PlayProgress {
  return createInitialPlayProgress()
}

export function composeOptionsFromProgress(progress: PlayProgress): ComposeOptions {
  const progression = getPlayProgression(progress.completedMissionIds)
  return {
    speciesIds: progression.unlockedSpeciesIds,
    materialIds: progression.unlockedMaterialIds,
    idiomId: progress.idiomId,
  }
}

export function composeFromProgress(progress: PlayProgress): PlayComposition {
  return composePlay(progress.parameters, composeOptionsFromProgress(progress))
}

export function composeTick(progress: PlayProgress): PlayTick {
  const progression = getPlayProgression(progress.completedMissionIds)
  const composition = composePlay(progress.parameters, {
    speciesIds: progression.unlockedSpeciesIds,
    materialIds: progression.unlockedMaterialIds,
    idiomId: progress.idiomId,
  })
  const active = missionById(progress.activeMissionId) ?? firstIncompleteMission(progress.completedMissionIds)
  const missionEvaluation = evaluateMission(active, composition)
  const missionResults = evaluateAllMissions(composition)
  const completed = new Set(progress.completedMissionIds)
  return {
    composition,
    progression,
    mission: active,
    missionEvaluation,
    missions: missionResults.map((evaluation) => {
      const mission = missionById(evaluation.missionId)
      if (!mission) throw new Error(`Missing mission ${evaluation.missionId}`)
      return {
        mission,
        completed: completed.has(mission.id),
        unlocked: missionUnlocked(mission, progress.completedMissionIds),
      }
    }),
  }
}

export function updatePlayParameter(
  progress: PlayProgress,
  id: keyof PlayProgress['parameters'],
  value: number,
): PlayProgress {
  return {
    ...progress,
    parameters: setPlayParameter(progress.parameters, id, value),
    lastGesture: null,
    applied: false,
  }
}

export function nudgePlayWithGesture(progress: PlayProgress, gesture: PlayGestureId): PlayProgress {
  const progression = getPlayProgression(progress.completedMissionIds)
  if (!progression.unlockedGestureIds.includes(gesture)) return progress
  return {
    ...progress,
    parameters: applyGesture(progress.parameters, gesture),
    lastGesture: gesture,
    applied: false,
  }
}

export function setPlayIdiom(progress: PlayProgress, idiomId: PlayProgress['idiomId']): PlayProgress {
  return getIdiom(idiomId) ? { ...progress, idiomId, applied: false } : progress
}

export function setPlayRenderMode(
  progress: PlayProgress,
  renderMode: PlayRenderModeId,
): PlayProgress {
  const progression = getPlayProgression(progress.completedMissionIds)
  if (!progression.unlockedRenderModeIds.includes(renderMode)) return progress
  return { ...progress, renderMode }
}

export function selectPlayMission(progress: PlayProgress, missionId: string): PlayProgress {
  const mission = missionById(missionId)
  if (!mission) return progress
  return { ...progress, activeMissionId: missionId }
}

/**
 * Record a mission only when its authored requirements actually pass. The
 * active mission advances to the next incomplete one, preserving the current
 * composition for further play.
 */
export function recordMissionPass(
  progress: PlayProgress,
  missionId: string,
  composition?: PlayComposition,
): PlayProgress {
  const mission = missionById(missionId)
  if (!mission) return progress
  const current = composition ?? composeFromProgress(progress)
  const evaluation = evaluateMission(mission, current)
  if (!evaluation.passed) return progress
  const completed = new Set(progress.completedMissionIds)
  completed.add(missionId)
  const completedMissionIds = [...completed]
  const active = firstIncompleteMission(completedMissionIds)
  return {
    ...progress,
    completedMissionIds,
    activeMissionId: active.id,
    applied: false,
  }
}

export function markPlayApplied(progress: PlayProgress, applied = true): PlayProgress {
  return { ...progress, applied }
}

export function setPlayObjectMode(progress: PlayProgress, mode: PlayObjectMode): PlayProgress {
  return ensurePlayObjectMode(progress, mode)
}

export function placePlayObject(
  progress: PlayProgress,
  kind: PlayObjectKind,
  xM: number,
  zM: number,
): PlayProgress {
  return addPlayObject(progress, kind, xM, zM)
}

export function serializePlayProgress(progress: PlayProgress): string {
  return JSON.stringify(progress)
}

export function parsePlayProgress(raw: string | null): PlayProgress {
  if (!raw) return createInitialPlayProgress()
  try {
    const value = JSON.parse(raw) as Partial<PlayProgress>
    if (value.schemaVersion !== 1) return createInitialPlayProgress()
    const parameters = normalizePlayParameters(value.parameters ?? {})
    const completedMissionIds = Array.isArray(value.completedMissionIds)
      ? [...new Set(value.completedMissionIds.filter((id): id is string => typeof id === 'string' && Boolean(missionById(id))))]
      : []
    const progression = getPlayProgression(completedMissionIds)
    const activeMissionId =
      typeof value.activeMissionId === 'string' && missionById(value.activeMissionId)
        ? value.activeMissionId
        : firstIncompleteMission(completedMissionIds).id
    const renderMode =
      typeof value.renderMode === 'string' &&
      progression.unlockedRenderModeIds.includes(value.renderMode as PlayRenderModeId)
        ? (value.renderMode as PlayRenderModeId)
        : 'diurno'
    const lastGesture =
      typeof value.lastGesture === 'string' &&
      progression.unlockedGestureIds.includes(value.lastGesture as PlayGestureId)
        ? (value.lastGesture as PlayGestureId)
        : null
    const objectMode = typeof value.objectMode === 'string' && isPlayObjectMode(value.objectMode)
      ? value.objectMode
      : 'landscape'
    const habitatId =
      typeof value.habitatId === 'string' && getHabitatArchetype(value.habitatId)
        ? value.habitatId
        : DEFAULT_HABITAT_ID
    const idiomId =
      typeof value.idiomId === 'string' && getIdiom(value.idiomId as never)
        ? (value.idiomId as typeof DEFAULT_IDIOM_ID)
        : DEFAULT_IDIOM_ID
    const rawObjects = Array.isArray(value.objects) ? value.objects : []
    const objects = rawObjects
      .filter((object): object is PlayObjectSpec =>
        Boolean(object) &&
        typeof object === 'object' &&
        typeof (object as PlayObjectSpec).id === 'string' &&
        typeof (object as PlayObjectSpec).kind === 'string' &&
        isPlayObjectKind((object as PlayObjectSpec).kind, objectMode),
      )
      .map((object) => {
        const normalized = normalizePlayObject(object)
        if (normalized.kind !== 'speaker') return normalized
        return normalized.personaId && getPersona(normalized.personaId)
          ? normalized
          : { ...normalized, personaId: DEFAULT_SPEAKER_PERSONA_ID }
      })
    return {
      schemaVersion: 1,
      habitatId,
      idiomId,
      parameters,
      completedMissionIds,
      activeMissionId,
      renderMode,
      lastGesture,
      applied: value.applied === true,
      objectMode,
      objects: objects.length > 0 ? objects : defaultPlayObjects(objectMode),
    }
  } catch {
    return createInitialPlayProgress()
  }
}
