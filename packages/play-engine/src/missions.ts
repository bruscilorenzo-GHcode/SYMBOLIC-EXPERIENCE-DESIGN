import type {
  MissionEvaluation,
  MissionRequirement,
  PlayComposition,
  PlayMission,
} from './types'

function parameter(
  id: string,
  label: string,
  hint: string,
  test: (composition: PlayComposition) => boolean,
): MissionRequirement {
  return { id, kind: 'parameter', label, hint, passed: test }
}

function acoustic(
  id: string,
  label: string,
  hint: string,
  test: (composition: PlayComposition) => boolean,
): MissionRequirement {
  return { id, kind: 'acoustic', label, hint, passed: test }
}

function musical(
  id: string,
  label: string,
  hint: string,
  test: (composition: PlayComposition) => boolean,
): MissionRequirement {
  return { id, kind: 'descriptor', label, hint, passed: test }
}

function social(
  id: string,
  label: string,
  hint: string,
  test: (composition: PlayComposition) => boolean,
): MissionRequirement {
  return { id, kind: 'social', label, hint, passed: test }
}

function ecological(
  id: string,
  label: string,
  hint: string,
  test: (composition: PlayComposition) => boolean,
): MissionRequirement {
  return { id, kind: 'ecological', label, hint, passed: test }
}

function score(
  id: string,
  label: string,
  hint: string,
  test: (composition: PlayComposition) => boolean,
): MissionRequirement {
  return { id, kind: 'score', label, hint, passed: test }
}

export const PLAY_MISSIONS: PlayMission[] = [
  {
    id: 'river-in-grove',
    index: 1,
    title: 'The river inside the grove',
    italian: 'Il fiume nel bosco',
    invocation: 'Yearning for water',
    description:
      'Make the grove and the river coexist without masking the water. The canopy must shelter, not swallow, the liquid voice.',
    poeticHint: 'Ombra sopra, ascolto sotto: il rivo deve restare udibile.',
    requiresCompletions: 0,
    requirements: [
      parameter('water-present', 'Il rivo è presente', 'Alza il Rivo oltre la metà.', (c) => c.parameters.water >= 0.5),
      parameter('canopy-shelter', 'La corona fa ombra senza chiudere', 'Tieni la Corona fra 0,32 e 0,80.', (c) => c.parameters.canopy >= 0.32 && c.parameters.canopy <= 0.8),
      acoustic('water-unmasked', 'Il rivo non è mascherato', 'Riduci vento e folla, oppure aumenta la corona.', (c) => c.acoustics.waterMasking <= 0.4),
      social('water-audible', 'L’acqua resta una voce', 'Rendi il rivo più presente e lascia spazio fra gli ospiti.', (c) => c.social.waterAudibility >= 0.36),
      acoustic('spatial-clarity', 'Lo spazio resta leggibile', 'Cerca chiarezza spaziale ≥ 0,46.', (c) => c.acoustics.spatialClarity >= 0.46),
    ],
  },
  {
    id: 'three-voices',
    index: 2,
    title: 'Three voices, no master',
    italian: 'Tre voci, nessun padrone',
    invocation: 'A polyphonic welcome',
    description:
      'Host at least three visitor motifs in different keys. No single voice should erase the others; the garden must answer as a chorus.',
    poeticHint: 'Tre centri tonali, una sola soglia ospitale.',
    requiresCompletions: 0,
    requirements: [
      social('three-visitors', 'Almeno tre ospiti', 'Aumenta gli Ospiti fino a tre presenze.', (c) => c.social.visitorCount >= 3),
      social('three-keys', 'Tre centri tonali distinti', 'Lascia che gli ospiti portino motivi in tonalità diverse.', (c) => c.social.distinctKeys >= 3),
      social('inclusion', 'La soglia accoglie', 'Cerca un’inclusione ≥ 0,5.', (c) => c.social.inclusion >= 0.5),
      social('no-voice-erased', 'Nessuna voce cancellata', 'Evita che la densità di una zona schiacci le altre.', (c) => c.social.coexistence.zoneMixes.every((mix) => mix.densityShare > 0.015)),
    ],
  },
  {
    id: 'veiled-air',
    index: 3,
    title: 'Veiled air, clear word',
    italian: 'Aria velata, parola chiara',
    invocation: 'A dark canopy that still speaks',
    description:
      'Use polluted-air data to darken the canopy while keeping intelligibility. The world may become heavy, but a voice must still find its way.',
    poeticHint: 'La polvere chiude il timbro; la chiarezza deve restare una finestra.',
    requiresCompletions: 0,
    requirements: [
      ecological('polluted-air', 'L’aria è velata', 'Aumenta la Pietra e riduci il Vento per far salire la polvere.', (c) => c.environmental.pollutionIndex >= 0.4),
      musical('darkened-brightness', 'Il timbro si scurisce', 'Mantieni la luminosità spettrale ≤ 0,58.', (c) => c.music.descriptor.brightness <= 0.58),
      acoustic('intelligible', 'La parola resta chiara', 'Cerca intelligibilità ≥ 0,5, con corona e assorbimento.', (c) => c.acoustics.intelligibility >= 0.5),
      parameter('canopy-cover', 'La corona raccoglie la polvere', 'Porta la copertura della corona sopra 0,45.', (c) => c.geometry.canopyCoverage >= 0.45),
    ],
  },
  {
    id: 'refuge-register',
    index: 4,
    title: 'A refuge for low and bright',
    italian: 'Rifugio di basso e luce',
    invocation: 'Where depth meets brightness',
    description:
      'Build a refuge where the low register and high brightness coexist. Shelter must not mean dullness: the dark floor can hold a bright ceiling.',
    poeticHint: 'Corona bassa, luce alta: un rifugio che non diventa una tomba.',
    requiresCompletions: 0,
    requirements: [
      musical('low-register', 'Il registro scende', 'Una corona ampia o molta pietra porta il registro in basso.', (c) => c.music.descriptor.register === 'low'),
      musical('high-brightness', 'La luce resta alta', 'Acqua e Luce devono mantenere la brillantezza ≥ 0,55.', (c) => c.music.descriptor.brightness >= 0.55),
      social('refuge', 'Il rifugio è riconoscibile', 'Cerca un rifugio ≥ 0,5 con ombra e raccoglimento.', (c) => c.social.refuge >= 0.5),
      acoustic('clarity', 'Il rifugio è leggibile', 'Mantieni chiarezza spaziale ≥ 0,44.', (c) => c.acoustics.spatialClarity >= 0.44),
    ],
  },
  {
    id: 'autumn-wind',
    index: 5,
    title: 'Autumn wind, no loss',
    italian: 'Vento d’autunno',
    invocation: 'A garden that bends without breaking',
    description:
      'Let an autumn wind move the garden without losing the musical thread. Wind is an instrument, not an erasure.',
    poeticHint: 'La caduta delle foglie è un ritmo; il vento non deve spezzare il coro.',
    requiresCompletions: 0,
    requirements: [
      parameter('autumn', 'La stagione è caduta', 'Porta la Stagione nel tratto autunnale (0,7–0,88).', (c) => c.season.phase === 'caduta'),
      parameter('wind-present', 'Il vento attraversa', 'Alza il Vento almeno a 0,4.', (c) => c.parameters.wind >= 0.4),
      acoustic('wind-contained', 'Il vento non cancella', 'Mantieni il mascheramento del vento ≤ 0,48.', (c) => c.acoustics.windMasking <= 0.48),
      score('coherence', 'Il filo musicale tiene', 'Cerca coerenza musicale ≥ 0,58.', (c) => c.scores.musicalCoherence >= 0.58),
    ],
  },
  {
    id: 'stone-water',
    index: 6,
    title: 'Stone that does not drink the river',
    italian: 'La pietra non beve il rivo',
    invocation: 'Hardness and flow together',
    description:
      'Make stone and water coexist: the mineral shell should lengthen the sound without swallowing the river’s clarity.',
    poeticHint: 'La pietra riflette; l’acqua risponde. Nessuna delle due deve sparire.',
    requiresCompletions: 0,
    requirements: [
      parameter('stone-present', 'La pietra è presente', 'Porta la Pietra almeno a 0,48.', (c) => c.parameters.stone >= 0.48),
      parameter('water-present', 'Il rivo è presente', 'Porta il Rivo almeno a 0,42.', (c) => c.parameters.water >= 0.42),
      acoustic('long-tail', 'La pietra allunga il suono', 'Cerca un T60 stimato ≥ 1,1 s.', (c) => c.acoustics.t60S >= 1.1),
      acoustic('clear-water', 'Il rivo resta chiaro', 'Mantieni la chiarezza ≥ 0,43.', (c) => c.acoustics.clarity >= 0.43),
    ],
  },
  {
    id: 'night-garden',
    index: 7,
    title: 'Night garden, quiet signals',
    italian: 'Giardino notturno',
    invocation: 'A smaller light, a larger listening',
    description:
      'At night, let the garden become a constellation of discrete presences. Low light should not mean low spectral life.',
    poeticHint: 'Poca luce, molte lucciole: la brillantezza viene dall’acqua e dalla pietra.',
    requiresCompletions: 0,
    requirements: [
      parameter('low-light', 'La luce si ritira', 'Abbassa la Luce sotto 0,34.', (c) => c.parameters.light <= 0.34),
      musical('spectral-life', 'Il timbro resta vivo', 'Mantieni la brillantezza ≥ 0,4.', (c) => c.music.descriptor.brightness >= 0.4),
      social('inclusion', 'Le presenze sono discrete', 'Cerca inclusione ≥ 0,45.', (c) => c.social.inclusion >= 0.45),
      acoustic('clarity', 'La notte non è opaca', 'Mantieni chiarezza spaziale ≥ 0,42.', (c) => c.acoustics.spatialClarity >= 0.42),
    ],
  },
  {
    id: 'shared-threshold',
    index: 8,
    title: 'A threshold for many',
    italian: 'Una soglia per molti',
    invocation: 'Hospitality without crowding',
    description:
      'Open the garden to many visitors without turning coexistence into a crowd. The threshold must remain a place, not a corridor.',
    poeticHint: 'Molti ospiti, nessuna folla: la densità è una forma di ascolto.',
    requiresCompletions: 0,
    requirements: [
      parameter('many-guests', 'La soglia si apre', 'Porta gli Ospiti almeno a 0,68.', (c) => c.parameters.guests >= 0.68),
      social('inclusion', 'La soglia include', 'Cerca inclusione ≥ 0,55.', (c) => c.social.inclusion >= 0.55),
      social('not-crowded', 'La soglia non è folla', 'Mantieni la folla percepita ≤ 0,74.', (c) => c.social.crowding <= 0.74),
      acoustic('crowd-unmasked', 'La folla non maschera', 'Mantieni il mascheramento della folla ≤ 0,44.', (c) => c.acoustics.crowdMasking <= 0.44),
    ],
  },
]

export function missionById(id: string): PlayMission | undefined {
  return PLAY_MISSIONS.find((mission) => mission.id === id)
}

export function requireMission(id: string): PlayMission {
  const mission = missionById(id)
  if (!mission) throw new Error(`Unknown play mission "${id}"`)
  return mission
}

export function evaluateMission(
  mission: PlayMission,
  composition: PlayComposition,
): MissionEvaluation {
  const requirements = mission.requirements.map((requirement) => ({
    id: requirement.id,
    label: requirement.label,
    hint: requirement.hint,
    passed: requirement.passed(composition),
  }))
  return {
    missionId: mission.id,
    passed: requirements.every((requirement) => requirement.passed),
    requirements,
    completedCount: 0,
  }
}

export function evaluateAllMissions(composition: PlayComposition): MissionEvaluation[] {
  return PLAY_MISSIONS.map((mission) => evaluateMission(mission, composition))
}

export function firstIncompleteMission(completedMissionIds: readonly string[]): PlayMission {
  const completed = new Set(completedMissionIds)
  return PLAY_MISSIONS.find((mission) => !completed.has(mission.id)) ?? PLAY_MISSIONS[PLAY_MISSIONS.length - 1]!
}

export function missionUnlocked(mission: PlayMission, completedMissionIds: readonly string[]): boolean {
  return new Set(completedMissionIds).size >= mission.requiresCompletions
}
