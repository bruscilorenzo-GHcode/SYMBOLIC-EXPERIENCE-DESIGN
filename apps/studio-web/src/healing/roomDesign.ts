import { create } from 'zustand'

/**
 * Healing Room configurator — design by Lorenzo Brusci and architect Greg Wilk.
 *
 * The configurator follows the MUSI-CO cross-ontological path:
 * 01 space → 02 sound modules → 03 characterisation (objects, light, sound)
 * → 04 session, and hands the configured room to the Metaplace, where it
 * becomes a station of the Improvement Plans.
 */

export type Bi = { it: string; en: string }
export type RoomPlanId = 'rite' | 'event'
export type SoundModuleId = 'shower' | 'ring' | 'dome' | 'floor' | 'walls' | 'binaural'
export type RoomObjectId = 'arches' | 'garden' | 'water' | 'disc' | 'domes' | 'capsules' | 'ledwall' | 'talisman'
export type LightSceneId = 'skylight' | 'amber' | 'green' | 'violet' | 'circadian'
export type AtmosphereId = 'forest' | 'water' | 'breath' | 'twin' | 'silence'
export type RoomStep = 1 | 2 | 3 | 4
export type RoomViewMode = 'plan' | 'axo'

export interface PlanZone {
  id: string
  label: Bi
  areaSqm: number
  color: string
}

export interface PlanGeometry {
  id: RoomPlanId
  label: Bi
  author: Bi
  summary: Bi
  /** Outer footprint in metres. */
  widthM: number
  depthM: number
  /** Gross area in m². */
  areaSqm: number
  zones: PlanZone[]
}

/** Functional colours of the PHAS plan (Healing Room design, Brusci / Wilk). */
export const ZONE_COLORS = {
  vestibule: '#eaa3bd',
  observation: '#9a98e0',
  healing: '#e8a59c',
  diagnostic: '#fcf0cd',
  garden: '#6cb34f',
  multimedia: '#3f9ff0',
  eventObservation: '#c6f2f7',
  eventFocus: '#f0c8f2',
  eventDiagnostic: '#93e3a2',
}

export const ROOM_PLANS: PlanGeometry[] = [
  {
    id: 'rite',
    label: { it: 'Rito di passaggio', en: 'Rite of passage' },
    author: { it: 'Impianto di progetto · circa 700 m² lordi', en: 'Project layout · about 700 m² gross' },
    summary: {
      it: 'Un anello in un quadrato: vestibolo e spogliatoio, sette stanze diagnostiche e di trattamento, la galleria circolare di osservazione e la Healing Room al centro, sotto il cielo.',
      en: 'A ring in a square: vestibule and changing room, seven diagnostic and treatment rooms, the circular observation gallery and the Healing Room at the centre, under the sky.',
    },
    widthM: 31.4,
    depthM: 29.6,
    areaSqm: 700,
    zones: [
      { id: 'healing', label: { it: 'Healing Room', en: 'Healing Room' }, areaSqm: 49.71, color: ZONE_COLORS.healing },
      { id: 'observation', label: { it: 'Spazio di osservazione', en: 'Observation space' }, areaSqm: 216.55, color: ZONE_COLORS.observation },
      { id: 'diagnostic', label: { it: 'Stanze diagnostiche (7)', en: 'Diagnostic rooms (7)' }, areaSqm: 305.44, color: ZONE_COLORS.diagnostic },
      { id: 'vestibule', label: { it: 'Vestibolo', en: 'Vestibule' }, areaSqm: 43.1, color: ZONE_COLORS.vestibule },
      { id: 'multimedia', label: { it: 'Multimedia', en: 'Multimedia' }, areaSqm: 0, color: ZONE_COLORS.multimedia },
      { id: 'garden', label: { it: 'Giardino', en: 'Garden' }, areaSqm: 0, color: ZONE_COLORS.garden },
    ],
  },
  {
    id: 'event',
    label: { it: 'Stazione evento', en: 'Event station' },
    author: { it: '255 m² nominali · 265,64 m² misurati', en: '255 m² nominal · 265.64 m² measured' },
    summary: {
      it: 'La versione da installazione: un ottagono d’osservazione con l’area focus circolare al centro e quattro spazi diagnostici a diamante sulle diagonali.',
      en: 'The installation version: an observation octagon with the circular focus area at its centre and four diamond-shaped diagnostic spaces on the diagonals.',
    },
    widthM: 24,
    depthM: 24,
    areaSqm: 265.64,
    zones: [
      { id: 'focus', label: { it: 'Area focus — terapia', en: 'Focus area — therapy' }, areaSqm: 41.05, color: ZONE_COLORS.eventFocus },
      { id: 'observation', label: { it: 'Spazio di osservazione', en: 'Observation space' }, areaSqm: 151.52, color: ZONE_COLORS.eventObservation },
      { id: 'diagnostic', label: { it: 'Spazi diagnostici A–D', en: 'Diagnostic spaces A–D' }, areaSqm: 73.07, color: ZONE_COLORS.eventDiagnostic },
    ],
  },
]

export interface SoundModuleSpec {
  id: SoundModuleId
  label: Bi
  summary: Bi
  channels: number
  where: Bi
}

export const SOUND_MODULES: SoundModuleSpec[] = [
  {
    id: 'shower',
    label: { it: 'Doccia sonora', en: 'Sound shower' },
    summary: { it: 'Un fascio zenitale sopra il centro: il suono cade su una sola persona.', en: 'A zenithal beam above the centre: sound falls on one person.' },
    channels: 4,
    where: { it: 'centro', en: 'centre' },
  },
  {
    id: 'ring',
    label: { it: 'Anello perimetrale', en: 'Perimeter ring' },
    summary: { it: 'Otto sorgenti lungo la galleria: il suono gira con chi cammina.', en: 'Eight sources along the gallery: sound turns with the walker.' },
    channels: 8,
    where: { it: 'galleria', en: 'gallery' },
  },
  {
    id: 'dome',
    label: { it: 'Cupola sferica', en: 'Spherical dome' },
    summary: { it: 'Campo ambisonico sopra l’area focus: il suono come volta.', en: 'Ambisonic field over the focus area: sound as a vault.' },
    channels: 16,
    where: { it: 'area focus', en: 'focus area' },
  },
  {
    id: 'floor',
    label: { it: 'Pavimento vibroacustico', en: 'Vibroacoustic floor' },
    summary: { it: 'Trasduttori sotto il pavimento: il basso si sente con il corpo.', en: 'Transducers under the floor: bass is felt through the body.' },
    channels: 4,
    where: { it: 'pavimento', en: 'floor' },
  },
  {
    id: 'walls',
    label: { it: 'Pareti risonanti', en: 'Resonant walls' },
    summary: { it: 'Eccitatori nei pannelli modulari: le pareti espositive suonano.', en: 'Exciters in the modular panels: the exhibition walls sound.' },
    channels: 6,
    where: { it: 'pareti', en: 'walls' },
  },
  {
    id: 'binaural',
    label: { it: 'VR analogica', en: 'Analogue VR' },
    summary: { it: 'Ascolto binaurale individuale nel tubo d’isolamento.', en: 'Individual binaural listening inside the isolation tube.' },
    channels: 2,
    where: { it: 'stanze diagnostiche', en: 'diagnostic rooms' },
  },
]

export interface RoomObjectSpec {
  id: RoomObjectId
  label: Bi
  summary: Bi
}

export const ROOM_OBJECTS: RoomObjectSpec[] = [
  { id: 'arches', label: { it: 'Archi in legno', en: 'Timber arches' }, summary: { it: 'Costolature radiali in lamellare: la struttura come ritmo.', en: 'Radial glulam ribs: structure as rhythm.' } },
  { id: 'garden', label: { it: 'Giardino vivo', en: 'Living garden' }, summary: { it: 'Piante e muschio lungo l’anello, il fuori che entra.', en: 'Plants and moss along the ring, the outside coming in.' } },
  { id: 'water', label: { it: 'Specchio d’acqua', en: 'Water mirror' }, summary: { it: 'Una vasca bassa che riflette il cielo e il suono.', en: 'A shallow basin reflecting sky and sound.' } },
  { id: 'disc', label: { it: 'Disco centrale', en: 'Central disc' }, summary: { it: 'La seduta circolare dove l’obiettivo si materializza.', en: 'The circular seat where the goal materialises.' } },
  { id: 'domes', label: { it: 'Cupole d’isolamento', en: 'Isolation domes' }, summary: { it: 'Gusci bianchi sospesi o a terra per l’ascolto singolo.', en: 'White shells, hanging or standing, for single listening.' } },
  { id: 'capsules', label: { it: 'Capsule biomorfiche', en: 'Biomorphic capsules' }, summary: { it: 'Poltrone-guscio intorno a un solo pensiero concentrato.', en: 'Shell armchairs around one concentrated thought.' } },
  { id: 'ledwall', label: { it: 'Pareti display', en: 'Display walls' }, summary: { it: 'Pannelli LED che espongono i dati dei visitatori.', en: 'LED panels exhibiting the visitors’ data.' } },
  { id: 'talisman', label: { it: 'Talismano phygital', en: 'Phygital talisman' }, summary: { it: 'Il dono all’uscita: una pietra che tiene la sessione.', en: 'The parting gift: a stone that keeps the session.' } },
]

export interface LightSceneSpec {
  id: LightSceneId
  label: Bi
  summary: Bi
  color: string
  glow: string
}

export const LIGHT_SCENES: LightSceneSpec[] = [
  { id: 'skylight', label: { it: 'Cielo zenitale', en: 'Zenithal sky' }, summary: { it: 'Il lucernario: luce naturale indiretta dall’alto.', en: 'The skylight: indirect natural light from above.' }, color: '#cfe6f5', glow: '#8fc4ea' },
  { id: 'amber', label: { it: 'Ambra sul legno', en: 'Amber on timber' }, summary: { it: 'Luce calda radente sugli archi e sulle sedute.', en: 'Warm grazing light on arches and seats.' }, color: '#f3c27a', glow: '#e09a3c' },
  { id: 'green', label: { it: 'Giardino digitale', en: 'Digital garden' }, summary: { it: 'Verde vivo delle pareti display: il Life/Digital Garden.', en: 'Live green of the display walls: the Life/Digital Garden.' }, color: '#7be08a', glow: '#2fbf55' },
  { id: 'violet', label: { it: 'Viola d’esposizione', en: 'Exhibition violet' }, summary: { it: 'Il viola della galleria diagnostica.', en: 'The violet of the diagnostic gallery.' }, color: '#a68cff', glow: '#6a4cff' },
  { id: 'circadian', label: { it: 'Ciclo circadiano', en: 'Circadian cycle' }, summary: { it: 'Dall’alba ambrata al blu profondo, lungo la sessione.', en: 'From amber dawn to deep blue, across the session.' }, color: '#f0b98a', glow: '#5b7fd6' },
]

export interface AtmosphereSpec {
  id: AtmosphereId
  label: Bi
  summary: Bi
}

export const ATMOSPHERES: AtmosphereSpec[] = [
  { id: 'forest', label: { it: 'Bosco', en: 'Forest' }, summary: { it: 'Aria filtrata e richiami lontani.', en: 'Filtered air and distant calls.' } },
  { id: 'water', label: { it: 'Acqua', en: 'Water' }, summary: { it: 'Onde lente, laguna, risacca.', en: 'Slow waves, lagoon, undertow.' } },
  { id: 'breath', label: { it: 'Respiro', en: 'Breath' }, summary: { it: 'Un bordone che respira con te.', en: 'A drone breathing with you.' } },
  { id: 'twin', label: { it: 'Voce del gemello', en: 'Twin’s voice' }, summary: { it: 'Il tono del Doppelgänger, dai tuoi dati.', en: 'The Doppelgänger’s tone, from your data.' } },
  { id: 'silence', label: { it: 'Silenzio abitato', en: 'Inhabited silence' }, summary: { it: 'Quasi nulla: la stanza che ascolta.', en: 'Almost nothing: the room listening.' } },
]

export const ROOM_STEPS: Array<{ step: RoomStep; label: Bi; hint: Bi }> = [
  { step: 1, label: { it: 'Spazio', en: 'Space' }, hint: { it: 'Scegli l’impianto e la scala.', en: 'Choose the layout and the scale.' } },
  { step: 2, label: { it: 'Moduli sonori', en: 'Sound modules' }, hint: { it: 'Accendi i moduli: compaiono in pianta.', en: 'Switch modules on: they appear in plan.' } },
  { step: 3, label: { it: 'Caratterizzazione', en: 'Character' }, hint: { it: 'Oggetti, luce e atmosfera sonora.', en: 'Objects, light and sound atmosphere.' } },
  { step: 4, label: { it: 'Sessione', en: 'Session' }, hint: { it: 'Attraversa la stanza che hai disegnato.', en: 'Walk through the room you designed.' } },
]

export interface RoomDesign {
  plan: RoomPlanId
  modules: SoundModuleId[]
  objects: RoomObjectId[]
  light: LightSceneId
  lightLevel: number
  atmosphere: AtmosphereId
}

export const DEFAULT_ROOM_DESIGN: RoomDesign = {
  plan: 'rite',
  modules: ['shower', 'ring'],
  objects: ['arches', 'garden', 'disc'],
  light: 'skylight',
  lightLevel: 0.7,
  atmosphere: 'forest',
}

const STORAGE_KEY = 'mas.healing.design.v1'

function load(): RoomDesign {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
    if (!raw) return DEFAULT_ROOM_DESIGN
    const data = JSON.parse(raw) as Partial<RoomDesign>
    const plan = ROOM_PLANS.some((p) => p.id === data.plan) ? (data.plan as RoomPlanId) : DEFAULT_ROOM_DESIGN.plan
    return {
      plan,
      modules: (data.modules ?? DEFAULT_ROOM_DESIGN.modules).filter((id) => SOUND_MODULES.some((m) => m.id === id)),
      objects: (data.objects ?? DEFAULT_ROOM_DESIGN.objects).filter((id) => ROOM_OBJECTS.some((o) => o.id === id)),
      light: LIGHT_SCENES.some((l) => l.id === data.light) ? (data.light as LightSceneId) : DEFAULT_ROOM_DESIGN.light,
      lightLevel: typeof data.lightLevel === 'number' ? Math.min(1, Math.max(0, data.lightLevel)) : DEFAULT_ROOM_DESIGN.lightLevel,
      atmosphere: ATMOSPHERES.some((a) => a.id === data.atmosphere) ? (data.atmosphere as AtmosphereId) : DEFAULT_ROOM_DESIGN.atmosphere,
    }
  } catch {
    return DEFAULT_ROOM_DESIGN
  }
}

interface RoomDesignStore {
  design: RoomDesign
  step: RoomStep
  view: RoomViewMode
  setStep: (step: RoomStep) => void
  setView: (view: RoomViewMode) => void
  setPlan: (plan: RoomPlanId) => void
  toggleModule: (id: SoundModuleId) => void
  toggleObject: (id: RoomObjectId) => void
  setLight: (id: LightSceneId) => void
  setLightLevel: (value: number) => void
  setAtmosphere: (id: AtmosphereId) => void
  reset: () => void
}

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((value) => value !== item) : [...list, item]
}

export const useRoomDesign = create<RoomDesignStore>((set) => ({
  design: load(),
  step: 1,
  view: 'axo',
  setStep: (step) => set({ step }),
  setView: (view) => set({ view }),
  setPlan: (plan) => set((s) => ({ design: { ...s.design, plan } })),
  toggleModule: (id) => set((s) => ({ design: { ...s.design, modules: toggle(s.design.modules, id) } })),
  toggleObject: (id) => set((s) => ({ design: { ...s.design, objects: toggle(s.design.objects, id) } })),
  setLight: (light) => set((s) => ({ design: { ...s.design, light } })),
  setLightLevel: (lightLevel) => set((s) => ({ design: { ...s.design, lightLevel } })),
  setAtmosphere: (atmosphere) => set((s) => ({ design: { ...s.design, atmosphere } })),
  reset: () => set({ design: DEFAULT_ROOM_DESIGN, step: 1 }),
}))

useRoomDesign.subscribe((state, previous) => {
  if (state.design === previous.design) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.design))
  } catch {
    // Local-only persistence never blocks the interface.
  }
})

export function planById(id: RoomPlanId): PlanGeometry {
  return ROOM_PLANS.find((plan) => plan.id === id) ?? ROOM_PLANS[0]!
}

export function lightById(id: LightSceneId): LightSceneSpec {
  return LIGHT_SCENES.find((light) => light.id === id) ?? LIGHT_SCENES[0]!
}

export function roomChannels(design: RoomDesign): number {
  return design.modules.reduce((acc, id) => acc + (SOUND_MODULES.find((m) => m.id === id)?.channels ?? 0), 0)
}

export function roomBrief(design: RoomDesign, lang: 'it' | 'en'): string {
  const t = (b: Bi): string => (lang === 'it' ? b.it : b.en)
  const plan = planById(design.plan)
  const modules = design.modules.map((id) => t(SOUND_MODULES.find((m) => m.id === id)!.label))
  const objects = design.objects.map((id) => t(ROOM_OBJECTS.find((o) => o.id === id)!.label))
  const atmosphere = t(ATMOSPHERES.find((a) => a.id === design.atmosphere)!.label)
  const lines =
    lang === 'it'
      ? [
          'HEALING ROOM — scheda di progetto',
          'Design: Lorenzo Brusci, Greg Wilk (architetto) · MUSI-CO / Symbolic Experience Design',
          '',
          `01 Spazio: ${t(plan.label)} — ${t(plan.author)}`,
          `02 Moduli sonori: ${modules.join(', ') || '—'} (${roomChannels(design)} canali)`,
          `03 Oggetti: ${objects.join(', ') || '—'}`,
          `   Luce: ${t(lightById(design.light).label)} al ${Math.round(design.lightLevel * 100)}%`,
          `   Atmosfera sonora: ${atmosphere}`,
          '',
          'Concept di studio, non specifica esecutiva: metrature e canali sono indicativi.',
        ]
      : [
          'HEALING ROOM — design sheet',
          'Design: Lorenzo Brusci, Greg Wilk (architect) · MUSI-CO / Symbolic Experience Design',
          '',
          `01 Space: ${t(plan.label)} — ${t(plan.author)}`,
          `02 Sound modules: ${modules.join(', ') || '—'} (${roomChannels(design)} channels)`,
          `03 Objects: ${objects.join(', ') || '—'}`,
          `   Light: ${t(lightById(design.light).label)} at ${Math.round(design.lightLevel * 100)}%`,
          `   Sound atmosphere: ${atmosphere}`,
          '',
          'Study concept, not a construction specification: areas and channels are indicative.',
        ]
  return lines.join('\n')
}
