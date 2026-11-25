import { create } from 'zustand'
import type {
  AcousticSpeakerProfile,
  ArchitecturalEnvironment,
  SpeakerPlacement,
  SpatialAudioSession,
  Vec3,
} from '@aura-spec/core-acoustics'
import { REFERENCE_PROFILES } from '@aura-spec/catalog'
import type {
  ArchitecturalItemKind,
  ArchitecturalItemSpec,
  ArchitectureIntent,
  DesignDirection,
  DesignZoneSpec,
  MusicFeatures,
  SiteContext,
  SoundscapePlan,
} from '@aura-spec/design-bridge'
import {
  DEFAULT_SITE_CONTEXT,
  architectureFromMusic,
  manualMusicFeatures,
  soundscapeFromArchitecture,
} from '@aura-spec/design-bridge'
import {
  buildArchitectureIntentFromPlay,
  composeFromProgress,
  createInitialPlayProgress,
  evaluateMission,
  getPlayProgression,
  markPlayApplied,
  musicFeaturesFromPlay,
  missionById,
  placePlayObject,
  removePlayObject,
  setPlayObjectMode,
  updatePlayObject,
  type PlayObjectKind,
  type PlayObjectMode,
  type PlayObjectSpec,
  nudgePlayWithGesture,
  recordMissionPass,
  resetPlayProgress,
  selectPlayMission,
  setPlayRenderMode,
  setPlayIdiom,
  updatePlayParameter,
  type MissionEvaluation,
  type PlayComposition,
  type PlayGestureId,
  type PlayParameterId,
  type PlayProgress,
  type PlayRenderModeId,
} from '@aura-spec/play-engine'
import type { PersonaKind, SpecLabSection } from '@aura-spec/inhabiting-model'
import {
  openSpecLab as tierOpenSpecLab,
  returnToInhabiting as tierReturnToInhabiting,
  createTierState,
  markTechnicalEdited,
  markTiersSynced,
} from '@aura-spec/inhabiting-model'
import type {
  CommunicationChannel,
  HealingLayoutId,
  HealingSessionState,
  HealingZoneId,
  StationKind,
} from '@aura-spec/healing-room'
import {
  createHealingSession,
  enterHealingZone,
  pushDiagnosticSample,
  setHealingFocus,
  setHealingLayout,
  setHealingStation,
} from '@aura-spec/healing-room'
import { applyHabitatArchetype, defaultSiteFromHabitat, setPlayObjectPersona } from '@aura-spec/play-engine'
import { DEMO_ENVIRONMENT, DEMO_PROFILES, DEMO_SESSION } from './demo'
import { environmentFromIntent, sessionFromIntent, sessionFromSoundscapePlan } from '../design/applyArchitecture'
import type { ImportedDrawing } from '../design/import/types'

export type OscStatus = 'idle' | 'connecting' | 'connected' | 'error'
export type AppView = 'site' | 'play' | 'spec' | 'healing' | 'metaplace'
export type StudioLang = 'it' | 'en'
export type DesignView = 'plan' | '3d'

const INITIAL_SITE: SiteContext = {
  ...DEFAULT_SITE_CONTEXT,
  widthM: 24,
  depthM: 16,
  ceilingHeightM: 6,
  daylight: 0.8,
}

const INITIAL_FEATURES = manualMusicFeatures({
  tempoBpm: 72,
  density: 0.5,
  brightness: 0.48,
  roughness: 0.36,
  dynamicRangeDb: 18,
})
const INITIAL_INTENT = architectureFromMusic(INITIAL_FEATURES, INITIAL_SITE)

interface StudioState {
  lang: StudioLang
  setLang: (lang: StudioLang) => void
  environment: ArchitecturalEnvironment
  session: SpatialAudioSession
  profiles: AcousticSpeakerProfile[]
  selectedSpeakerId: string | null
  selectedSourceId: string | null
  frequencyHz: number
  showPolar: boolean
  showHeatmap: boolean
  oscStatus: OscStatus

  appView: AppView
  specSection: SpecLabSection
  tier: ReturnType<typeof createTierState>
  designDirection: DesignDirection
  designView: DesignView
  site: SiteContext
  designItems: ArchitecturalItemSpec[]
  designZones: DesignZoneSpec[]
  activeDesignTool: ArchitecturalItemKind | null
  selectedDesignItemId: string | null
  importedDrawing: ImportedDrawing | null
  architectureIntent: ArchitectureIntent | null
  soundscapePlan: SoundscapePlan | null
  musicFeatures: MusicFeatures | null
  analysisStatus: string
  play: PlayProgress
  healing: HealingSessionState

  setHealing: (healing: HealingSessionState) => void
  enterHealingZone: (zone: HealingZoneId) => void
  setHealingLayout: (layout: HealingLayoutId) => void
  setHealingStation: (station: StationKind) => void
  pushHealingSample: (channel: CommunicationChannel, value: number) => void
  setHealingFocus: (focus: number) => void
  resetHealing: () => void

  selectSpeaker: (id: string | null) => void
  selectSource: (id: string | null) => void
  updateSpeaker: (id: string, patch: Partial<SpeakerPlacement>) => void
  addSpeaker: (profileId: string) => void
  removeSpeaker: (id: string) => void
  updateSourcePosition: (id: string, positionM: Vec3) => void
  updateSourceGain: (id: string, gainDb: number) => void
  updateSourceSpread: (id: string, spreadDeg: number) => void
  setFrequency: (frequencyHz: number) => void
  togglePolar: () => void
  toggleHeatmap: () => void
  setOscStatus: (status: OscStatus) => void

  setAppView: (view: AppView) => void
  openSpecLab: (section?: SpecLabSection) => void
  returnToInhabiting: () => void
  setSpecSection: (section: SpecLabSection) => void
  setPlayHabitat: (habitatId: string) => void
  setPlayPersona: (objectId: string, personaId: PersonaKind) => void
  setDesignDirection: (direction: DesignDirection) => void
  setDesignView: (view: DesignView) => void
  setSite: (patch: Partial<SiteContext>) => void
  setActiveDesignTool: (kind: ArchitecturalItemKind | null) => void
  selectDesignItem: (id: string | null) => void
  addDesignItem: (kind: ArchitecturalItemKind, xM: number, zM: number) => void
  updateDesignItem: (id: string, patch: Partial<ArchitecturalItemSpec>) => void
  removeDesignItem: (id: string) => void
  setImportedDrawing: (drawing: ImportedDrawing | null) => void
  setMusicFeatures: (features: MusicFeatures | null) => void
  setAnalysisStatus: (status: string) => void
  applyArchitectureIntent: (intent: ArchitectureIntent) => void
  previewSoundscapePlan: (plan: SoundscapePlan) => void
  applySoundscapePlan: (plan: SoundscapePlan) => void

  setPlayProgress: (progress: PlayProgress) => void
  setPlayParameter: (id: PlayParameterId, value: number) => void
  applyPlayGesture: (id: PlayGestureId) => void
  setPlayRenderMode: (id: PlayRenderModeId) => void
  setPlayIdiom: (id: PlayProgress['idiomId']) => void
  selectPlayMission: (id: string) => void
  setPlayObjectMode: (mode: PlayObjectMode) => void
  placePlayObject: (kind: PlayObjectKind, xM: number, zM: number) => void
  updatePlayObject: (id: string, patch: Partial<Omit<PlayObjectSpec, 'id' | 'kind'>>) => void
  removePlayObject: (id: string) => void
  commitPlayMission: (id: string) => MissionEvaluation | null
  applyPlayComposition: () => PlayComposition | null
  resetPlay: () => void
}

function storedLang(): StudioLang {
  try {
    return localStorage.getItem('mas.site.lang') === 'en' ? 'en' : 'it'
  } catch {
    return 'it'
  }
}

export const useStudioStore = create<StudioState>((set, get) => ({
  lang: storedLang(),
  setLang: (lang) => {
    try {
      localStorage.setItem('mas.site.lang', lang)
    } catch {
      // Preference only.
    }
    set({ lang })
  },
  environment: DEMO_ENVIRONMENT,
  session: DEMO_SESSION,
  profiles: [...DEMO_PROFILES, ...REFERENCE_PROFILES.filter((profile) => !DEMO_PROFILES.some((demo) => demo.id === profile.id))],
  selectedSpeakerId: DEMO_SESSION.speakerPlacements[0]?.id ?? null,
  selectedSourceId: DEMO_SESSION.sources[0]?.id ?? null,
  frequencyHz: 1000,
  showPolar: true,
  showHeatmap: true,
  oscStatus: 'idle',

  appView: 'site',
  specSection: 'blueprint',
  tier: createTierState(),
  designDirection: 'music-to-space',
  designView: 'plan',
  site: INITIAL_SITE,
  designItems: INITIAL_INTENT.items,
  designZones: INITIAL_INTENT.zones,
  activeDesignTool: null,
  selectedDesignItemId: null,
  importedDrawing: null,
  architectureIntent: null,
  soundscapePlan: null,
  musicFeatures: INITIAL_FEATURES,
  analysisStatus: 'Initial manual feature set. Analyze a file or the live input, or edit the values.',
  play: createInitialPlayProgress(),
  healing: createHealingSession(),

  setHealing: (healing) => set({ healing }),
  enterHealingZone: (zone) => set((state) => ({ healing: enterHealingZone(state.healing, zone) })),
  setHealingLayout: (layout) => set((state) => ({ healing: setHealingLayout(state.healing, layout) })),
  setHealingStation: (station) => set((state) => ({ healing: setHealingStation(state.healing, station) })),
  pushHealingSample: (channel, value) =>
    set((state) => ({ healing: pushDiagnosticSample(state.healing, channel, value, Date.now()) })),
  setHealingFocus: (focus) => set((state) => ({ healing: setHealingFocus(state.healing, focus) })),
  resetHealing: () => set({ healing: createHealingSession() }),

  selectSpeaker: (id) => set({ selectedSpeakerId: id }),
  selectSource: (id) => set({ selectedSourceId: id }),

  updateSpeaker: (id, patch) =>
    set((state) => {
      let play = state.play
      let tier = state.tier
      const playObjectId = id.startsWith('play-speaker-') ? id.slice('play-speaker-'.length) : null
      if (playObjectId && (patch.positionM || patch.orientationDeg)) {
        play = {
          ...state.play,
          applied: true,
          objects: state.play.objects.map((object) =>
            object.id === playObjectId
              ? {
                  ...object,
                  xM: patch.positionM ? patch.positionM[0] : object.xM,
                  zM: patch.positionM ? patch.positionM[2] : object.zM,
                  rotationDeg: patch.orientationDeg ? patch.orientationDeg[0] : object.rotationDeg,
                }
              : object,
          ),
        }
        tier = markTiersSynced(state.tier)
      }
      return {
        session: {
          ...state.session,
          speakerPlacements: state.session.speakerPlacements.map((placement) =>
            placement.id === id ? { ...placement, ...patch } : placement,
          ),
        },
        play,
        tier,
      }
    }),

  addSpeaker: (profileId) =>
    set((state) => {
      const profile = state.profiles.find((item) => item.id === profileId)
      if (!profile) return state
      const id = `spk-${Date.now().toString(36)}`
      const placement: SpeakerPlacement = {
        id,
        profileId,
        label: profile.model.name,
        positionM: [0, 2.5, 0],
        orientationDeg: [0, 0, 0],
        gainDb: 0,
        delayMs: 0,
        polarity: 0,
        groupIds: [],
        locked: false,
      }
      return {
        session: { ...state.session, speakerPlacements: [...state.session.speakerPlacements, placement] },
        selectedSpeakerId: id,
      }
    }),

  removeSpeaker: (id) =>
    set((state) => ({
      session: {
        ...state.session,
        speakerPlacements: state.session.speakerPlacements.filter((placement) => placement.id !== id),
      },
      selectedSpeakerId: state.selectedSpeakerId === id ? null : state.selectedSpeakerId,
    })),

  updateSourcePosition: (id, positionM) =>
    set((state) => ({
      session: {
        ...state.session,
        sources: state.session.sources.map((source) =>
          source.id === id ? { ...source, positionM } : source,
        ),
      },
    })),

  updateSourceGain: (id, gainDb) =>
    set((state) => ({
      session: {
        ...state.session,
        sources: state.session.sources.map((source) =>
          source.id === id ? { ...source, gainDb } : source,
        ),
      },
    })),

  updateSourceSpread: (id, spreadDeg) =>
    set((state) => ({
      session: {
        ...state.session,
        sources: state.session.sources.map((source) =>
          source.id === id ? { ...source, spreadDeg } : source,
        ),
      },
    })),

  setFrequency: (frequencyHz) => set({ frequencyHz }),
  togglePolar: () => set((state) => ({ showPolar: !state.showPolar })),
  toggleHeatmap: () => set((state) => ({ showHeatmap: !state.showHeatmap })),
  setOscStatus: (oscStatus) => set({ oscStatus }),

  setAppView: (appView) => set({ appView }),
  openSpecLab: (section = 'blueprint') =>
    set((state) => ({ appView: 'spec', specSection: section, tier: tierOpenSpecLab(state.tier, section) })),
  returnToInhabiting: () =>
    set((state) => ({ appView: 'play', tier: tierReturnToInhabiting(state.tier) })),
  setSpecSection: (specSection) =>
    set((state) => ({ specSection, tier: markTechnicalEdited(state.tier) })),
  setPlayHabitat: (habitatId) =>
    set((state) => ({
      play: applyHabitatArchetype(state.play, habitatId),
      site: defaultSiteFromHabitat(habitatId),
    })),
  setPlayPersona: (objectId, personaId) =>
    set((state) => ({ play: setPlayObjectPersona(state.play, objectId, personaId) })),
  setDesignDirection: (designDirection) => set({ designDirection }),
  setDesignView: (designView) => set({ designView }),
  setSite: (patch) => set((state) => ({ site: { ...state.site, ...patch } })),
  setActiveDesignTool: (activeDesignTool) => set({ activeDesignTool }),
  selectDesignItem: (selectedDesignItemId) => set({ selectedDesignItemId }),

  addDesignItem: (kind, xM, zM) =>
    set((state) => {
      const defaults = ITEM_DEFAULTS[kind]
      const id = `item-${kind}-${Date.now().toString(36)}`
      const item: ArchitecturalItemSpec = {
        id,
        kind,
        label: defaults.label,
        xM,
        zM,
        widthM: defaults.widthM,
        depthM: defaults.depthM,
        heightM: defaults.heightM,
        baseHeightM: defaults.baseHeightM,
        rotationDeg: 0,
        materialId: defaults.materialId,
        color: defaults.color,
      }
      return {
        designItems: [...state.designItems, item],
        selectedDesignItemId: id,
        activeDesignTool: null,
      }
    }),

  updateDesignItem: (id, patch) =>
    set((state) => ({
      designItems: state.designItems.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    })),

  removeDesignItem: (id) =>
    set((state) => ({
      designItems: state.designItems.filter((item) => item.id !== id),
      selectedDesignItemId: state.selectedDesignItemId === id ? null : state.selectedDesignItemId,
    })),

  setImportedDrawing: (importedDrawing) => set({ importedDrawing }),
  setMusicFeatures: (musicFeatures) => set({ musicFeatures }),
  setAnalysisStatus: (analysisStatus) => set({ analysisStatus }),

  applyArchitectureIntent: (intent) =>
    set((state) => ({
      environment: environmentFromIntent(intent, state.environment),
      session: sessionFromIntent(intent, state.session),
      site: intent.site,
      designItems: intent.items,
      designZones: intent.zones,
      architectureIntent: intent,
      soundscapePlan: null,
      selectedDesignItemId: null,
      selectedSpeakerId: intent.speakers[0]?.id ?? null,
      appView: 'spec',
      specSection: 'geometry',
      designView: 'plan',
    })),

  previewSoundscapePlan: (plan) => set({ soundscapePlan: plan }),

  applySoundscapePlan: (plan) =>
    set((state) => ({
      session: sessionFromSoundscapePlan(plan, state.session),
      soundscapePlan: plan,
      selectedSourceId: plan.sources[0]?.id ?? null,
      appView: 'spec',
      specSection: 'blueprint',
    })),

  setPlayProgress: (play) => set({ play }),
  setPlayParameter: (id, value) =>
    set((state) => ({ play: updatePlayParameter(state.play, id, value) })),
  applyPlayGesture: (id) =>
    set((state) => ({ play: nudgePlayWithGesture(state.play, id) })),
  setPlayRenderMode: (id) =>
    set((state) => ({ play: setPlayRenderMode(state.play, id) })),
  setPlayIdiom: (id) =>
    set((state) => ({ play: setPlayIdiom(state.play, id) })),
  selectPlayMission: (id) =>
    set((state) => ({ play: selectPlayMission(state.play, id) })),
  setPlayObjectMode: (mode) =>
    set((state) => ({ play: setPlayObjectMode(state.play, mode) })),
  placePlayObject: (kind, xM, zM) =>
    set((state) => ({ play: placePlayObject(state.play, kind, xM, zM) })),
  updatePlayObject: (id, patch) =>
    set((state) => ({ play: updatePlayObject(state.play, id, patch) })),
  removePlayObject: (id) =>
    set((state) => ({ play: removePlayObject(state.play, id) })),

  commitPlayMission: (id) => {
    const state = get()
    const mission = missionById(id)
    if (!mission) return null
    const composition = composeFromProgress(state.play)
    const evaluation = evaluateMission(mission, composition)
    if (!evaluation.passed) return evaluation
    set({ play: recordMissionPass(state.play, id, composition) })
    return evaluation
  },

  applyPlayComposition: () => {
    const state = get()
    const composition = composeFromProgress(state.play)
    const intent = buildArchitectureIntentFromPlay(composition, {
      ...state.site,
      siteKind: state.play.objectMode === 'indoor' ? 'indoor' : 'outdoor',
    }, state.play.objects)
    const environment = environmentFromIntent(intent, state.environment)
    const baseSession = sessionFromIntent(intent, state.session)
    const plan = soundscapeFromArchitecture(environment, baseSession)
    const session = sessionFromSoundscapePlan(plan, baseSession)
    set({
      environment,
      session,
      site: intent.site,
      designItems: intent.items,
      designZones: intent.zones,
      architectureIntent: intent,
      soundscapePlan: plan,
      musicFeatures: musicFeaturesFromPlay(composition),
      selectedSourceId: plan.sources[0]?.id ?? state.selectedSourceId,
      selectedSpeakerId: intent.speakers[0]?.id ?? state.selectedSpeakerId,
      analysisStatus: `AURA PLAY applied · ${composition.music.descriptorLabel} · ${getPlayProgression(state.play.completedMissionIds).title}`,
      play: markPlayApplied(state.play),
      appView: 'site',
    })
    return composition
  },

  resetPlay: () => set({ play: resetPlayProgress() }),
}))

const ITEM_DEFAULTS: Record<
  ArchitecturalItemKind,
  {
    label: string
    widthM: number
    depthM: number
    heightM: number
    baseHeightM: number
    materialId: string
    color: string
  }
> = {
  floor: { label: 'Floor', widthM: 6, depthM: 4, heightM: 0.12, baseHeightM: 0, materialId: 'design-stone', color: '#767b74' },
  wall: { label: 'Wall', widthM: 6, depthM: 0.25, heightM: 3, baseHeightM: 0, materialId: 'design-concrete', color: '#8d8f89' },
  glass: { label: 'Glass', widthM: 4, depthM: 0.2, heightM: 3, baseHeightM: 0, materialId: 'design-glass', color: '#9fd6e8' },
  canopy: { label: 'Canopy', widthM: 5, depthM: 4, heightM: 0.18, baseHeightM: 3, materialId: 'design-wood', color: '#a88c68' },
  planter: { label: 'Planter', widthM: 2, depthM: 1.2, heightM: 0.45, baseHeightM: 0, materialId: 'design-planting', color: '#6f8b61' },
  water: { label: 'Water', widthM: 3, depthM: 2, heightM: 0.06, baseHeightM: 0, materialId: 'design-water', color: '#4e8fa8' },
  stage: { label: 'Stage', widthM: 4, depthM: 3, heightM: 0.42, baseHeightM: 0, materialId: 'design-wood', color: '#9b7a57' },
  path: { label: 'Path', widthM: 2, depthM: 6, heightM: 0.04, baseHeightM: 0, materialId: 'design-stone', color: '#a2a49d' },
  column: { label: 'Column', widthM: 0.45, depthM: 0.45, heightM: 3, baseHeightM: 0, materialId: 'design-concrete', color: '#7a7d77' },
  opening: { label: 'Opening', widthM: 2, depthM: 0.2, heightM: 2.4, baseHeightM: 0, materialId: 'design-glass', color: '#c9edf4' },
}
