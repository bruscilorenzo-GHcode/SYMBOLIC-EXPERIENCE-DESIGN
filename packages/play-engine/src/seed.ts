import type { PlayComposition } from './types'

export type SeedLang = 'it' | 'en'
import type { PlayObjectMode } from './types'
import type { PlayProgression } from './types'

export interface PlaySeedBrief {
  name: string
  email: string
  site: string
  kind: PlayObjectMode | 'phygital'
  atmosphere: string
  budget: 'essenziale' | 'consapevole' | 'completo' | 'signature'
  timeline: 'esplorazione' | '6-12 mesi' | '12-24 mesi' | 'flessibile'
  notes: string
}

export interface PlaySeedSummary {
  title: string
  archetype: string
  atmosphere: string
  narrative: string
  materials: string[]
  process: string[]
  projectArchetypes: string[]
  manifesto: string
  technicalSummary: string
}

export const MAS_BRIEF_STORAGE_KEY = 'mas.play.brief.v1'

export const MAS_MANIFESTO =
  'Ascoltiamo il luogo, leggiamo la luce e compiamo spazio e suono come una sola materia.'

export const MAS_PROCESS = [
  'Ascoltare',
  'Leggere il sito',
  'Comporre spazio e suono',
  'Specificare',
  'Costruire',
] as const

export const MAS_ARCHETYPES = [
  'Corte mediterranea',
  'Giardino sonoro',
  'Rifugio costiero',
] as const

export const MAS_ARCHETYPES_EN = [
  'Mediterranean courtyard',
  'Sonic garden',
  'Coastal refuge',
] as const

export const MAS_PROCESS_EN = [
  'Listen',
  'Read the site',
  'Compose space and sound',
  'Specify',
  'Build',
] as const

export const MAS_MANIFESTO_EN =
  'We listen to the place, read the light, and compose space and sound as one material.'

export function buildSeedSummary(
  composition: PlayComposition,
  progression: PlayProgression,
  objectMode: PlayObjectMode,
  lang: SeedLang = 'it',
): PlaySeedSummary {
  const { parameters, season, geometry, music, environmental, social } = composition
  const t = (it: string, en: string): string => (lang === 'it' ? it : en)
  const archetype = chooseArchetype(parameters.canopy, parameters.water, parameters.stone, objectMode, lang)
  const atmosphere = atmosphereFor(season.label, music.descriptor.brightness, social.inclusion, lang)
  const materials = materialNarrative(composition, lang)
  const narrative = [
    t(
      `Un luogo ${archetype.label.toLowerCase()} dove ${atmosphere.clause}.`,
      `A ${archetype.label.toLowerCase()} where ${atmosphere.clause}.`,
    ),
    t(
      `La ${parameters.canopy > 0.58 ? 'corona alta' : 'luce aperta'} incontra ${
        parameters.water > 0.58 ? 'l’acqua' : parameters.stone > 0.58 ? 'la pietra' : 'la terra'
      }.`,
      `The ${parameters.canopy > 0.58 ? 'high canopy' : 'open light'} meets ${
        parameters.water > 0.58 ? 'water' : parameters.stone > 0.58 ? 'stone' : 'earth'
      }.`,
    ),
    t(
      `Gli ospiti percepiscono ${social.inclusion > 0.62 ? 'un invito condiviso' : 'un raccoglimento discreto'}.`,
      `Guests experience ${social.inclusion > 0.62 ? 'a shared invitation' : 'a quiet retreat'}.`,
    ),
  ].join(' ')

  return {
    title: t(`Seme spaziale · ${archetype.label}`, `Spatial seed · ${archetype.label}`),
    archetype: archetype.label,
    atmosphere: atmosphere.label,
    narrative,
    materials,
    process: lang === 'it' ? [...MAS_PROCESS] : [...MAS_PROCESS_EN],
    projectArchetypes: lang === 'it' ? [...MAS_ARCHETYPES] : [...MAS_ARCHETYPES_EN],
    manifesto: t(MAS_MANIFESTO, MAS_MANIFESTO_EN),
    technicalSummary: [
      `${music.descriptorLabel}`,
      `${t('T60', 'T60')} ${composition.acoustics.t60S.toFixed(2)}s`,
      `${t('chiarezza', 'clarity')} ${composition.acoustics.spatialClarity.toFixed(2)}`,
      `${t('corona', 'canopy')} ${geometry.canopyCoverage.toFixed(2)}`,
      `${t('acqua', 'water')} ${parameters.water.toFixed(2)}`,
      `${t('aria', 'air')} ${environmental.airQuality.toFixed(2)}`,
      `${t('progressione', 'stage')} ${progression.title}`,
    ].join(' · '),
  }
}

export function buildSeedBriefText(
  seed: PlaySeedSummary,
  brief: PlaySeedBrief,
  composition: PlayComposition,
  lang: SeedLang = 'it',
): string {
  return (lang === 'it'
    ? [
        'MED.IA ARCHITECTURE STUDIO — Richiesta di progetto',
        '',
        seed.title,
        seed.narrative,
        '',
        `Manifesto: ${seed.manifesto}`,
        `Processo: ${seed.process.join(' → ')}`,
        `Archetipi di riferimento: ${seed.projectArchetypes.join(' · ')}`,
        '',
        '— Il seme del visitatore —',
        `Nome: ${brief.name || '—'}`,
        `Email: ${brief.email || '—'}`,
        `Luogo: ${brief.site || '—'}`,
        `Tipo: ${kindLabel(brief.kind)}`,
        `Atmosfera desiderata: ${brief.atmosphere || seed.atmosphere}`,
        `Budget: ${budgetLabel(brief.budget)}`,
        `Tempo: ${timelineLabel(brief.timeline)}`,
        `Note: ${brief.notes || '—'}`,
        '',
        '— Attributi del seme —',
        `Archetipo: ${seed.archetype}`,
        `Materie: ${seed.materials.join(' · ')}`,
        `Atmosfera generata: ${seed.atmosphere}`,
        `Musica: ${composition.music.descriptorLabel}`,
        `Coerenza ${composition.scores.musicalCoherence.toFixed(2)} · Ecologia ${composition.scores.ecologicalBalance.toFixed(2)} · Inclusione ${composition.scores.inclusion.toFixed(2)} · Chiarezza ${composition.scores.spatialClarity.toFixed(2)} · Novità ${composition.scores.novelty.toFixed(2)}`,
        `Specifica tecnica interna: ${seed.technicalSummary}`,
        '',
        'Il gioco è l’inizio della conversazione. MAS progetta lo spazio reale.',
      ]
    : [
        'MED.IA ARCHITECTURE STUDIO — Project request',
        '',
        seed.title,
        seed.narrative,
        '',
        `Manifesto: ${seed.manifesto}`,
        `Process: ${seed.process.join(' → ')}`,
        `Reference archetypes: ${seed.projectArchetypes.join(' · ')}`,
        '',
        '— The visitor’s seed —',
        `Name: ${brief.name || '—'}`,
        `Email: ${brief.email || '—'}`,
        `Site: ${brief.site || '—'}`,
        `Type: ${kindLabel(brief.kind, 'en')}`,
        `Desired atmosphere: ${brief.atmosphere || seed.atmosphere}`,
        `Budget: ${budgetLabel(brief.budget, 'en')}`,
        `Timeline: ${timelineLabel(brief.timeline, 'en')}`,
        `Notes: ${brief.notes || '—'}`,
        '',
        '— Seed attributes —',
        `Archetype: ${seed.archetype}`,
        `Materials: ${seed.materials.join(' · ')}`,
        `Generated atmosphere: ${seed.atmosphere}`,
        `Music: ${composition.music.descriptorLabel}`,
        `Coherence ${composition.scores.musicalCoherence.toFixed(2)} · Ecology ${composition.scores.ecologicalBalance.toFixed(2)} · Inclusion ${composition.scores.inclusion.toFixed(2)} · Clarity ${composition.scores.spatialClarity.toFixed(2)} · Novelty ${composition.scores.novelty.toFixed(2)}`,
        `Internal technical summary: ${seed.technicalSummary}`,
        '',
        'The game is the beginning of the conversation. MAS designs the real space.',
      ]).join('\n')
}

export function masMailtoHref(
  brief: PlaySeedBrief,
  seed: PlaySeedSummary,
  composition: PlayComposition,
  to = '',
  lang: SeedLang = 'it',
): string {
  const subject = lang === 'it' ? `Richiesta MAS · ${seed.archetype}` : `MAS request · ${seed.archetype}`
  const body = buildSeedBriefText(seed, brief, composition, lang)
  const query = new URLSearchParams({ subject, body })
  return `mailto:${to}?${query.toString()}`
}

export function defaultSeedBrief(): PlaySeedBrief {
  return {
    name: '',
    email: '',
    site: '',
    kind: 'landscape',
    atmosphere: '',
    budget: 'consapevole',
    timeline: '6-12 mesi',
    notes: '',
  }
}

export function budgetLabel(value: PlaySeedBrief['budget'], lang: SeedLang = 'it'): string {
  const labels = lang === 'it'
    ? { essenziale: 'Essenziale', consapevole: 'Consapevole', completo: 'Completo', signature: 'Signature' }
    : { essenziale: 'Essential', consapevole: 'Considered', completo: 'Complete', signature: 'Signature' }
  return labels[value]
}

export function timelineLabel(value: PlaySeedBrief['timeline'], lang: SeedLang = 'it'): string {
  const labels = lang === 'it'
    ? { esplorazione: 'Ancora in esplorazione', '6-12 mesi': '6–12 mesi', '12-24 mesi': '12–24 mesi', flessibile: 'Flessibile' }
    : { esplorazione: 'Still exploring', '6-12 mesi': '6–12 months', '12-24 mesi': '12–24 months', flessibile: 'Flexible' }
  return labels[value]
}

export function kindLabel(value: PlaySeedBrief['kind'], lang: SeedLang = 'it'): string {
  const labels = lang === 'it'
    ? { landscape: 'Esterno / paesaggio', indoor: 'Interno / architettura', phygital: 'Interno ed esterno' }
    : { landscape: 'Outdoor / landscape', indoor: 'Indoor / architecture', phygital: 'Indoor and outdoor' }
  return labels[value]
}

function chooseArchetype(
  canopy: number,
  water: number,
  stone: number,
  objectMode: PlayObjectMode,
  lang: SeedLang = 'it',
): { label: string } {
  const t = (it: string, en: string): string => (lang === 'it' ? it : en)
  if (objectMode === 'indoor') return { label: t('Camera che ascolta', 'A room that listens') }
  if (water > 0.62 && canopy > 0.56) return { label: t('Giardino-teatro sull’acqua', 'Water theatre garden') }
  if (canopy > 0.66) return { label: t('Rifugio di foglie', 'Leaf refuge') }
  if (water > 0.62) return { label: t('Corte dell’acqua', 'Water courtyard') }
  if (stone > 0.62) return { label: t('Soglia di pietra', 'Stone threshold') }
  return { label: t('Radura mediterranea', 'Mediterranean clearing') }
}

function atmosphereFor(
  seasonLabel: string,
  brightness: number,
  inclusion: number,
  lang: SeedLang = 'it',
): { label: string; clause: string } {
  const t = (it: string, en: string): string => (lang === 'it' ? it : en)
  if (brightness > 0.68 && inclusion > 0.62) {
    return {
      label: t('Luce aperta e ospitale', 'Open, hospitable light'),
      clause: t('la luce invita senza esporre', 'light invites without exposing'),
    }
  }
  if (brightness < 0.34) {
    return {
      label: t('Ombra densa e discreta', 'Dense, discreet shade'),
      clause: t('l’ombra protegge la voce', 'shade protects the voice'),
    }
  }
  if (seasonLabel.toLowerCase() === 'caduta') {
    return {
      label: t('Autunno caldo e avvolgente', 'Warm, enveloping autumn'),
      clause: t('le foglie raccolgono il suono', 'leaves gather the sound'),
    }
  }
  return {
    label: t('Atmosfera morbida e contemporanea', 'Soft, contemporary atmosphere'),
    clause: t('lo spazio respira con chi lo abita', 'space breathes with those who inhabit it'),
  }
}

function materialNarrative(composition: PlayComposition, lang: SeedLang = 'it'): string[] {
  const t = (it: string, en: string): string => (lang === 'it' ? it : en)
  const materials: string[] = []
  if (composition.parameters.canopy > 0.42) materials.push(t('foglie e ombra', 'leaves and shade'))
  if (composition.parameters.water > 0.42) materials.push(t('acqua e riflesso', 'water and reflection'))
  if (composition.parameters.stone > 0.42) materials.push(t('pietra locale', 'local stone'))
  if (composition.parameters.light > 0.58) materials.push(t('luce calda', 'warm light'))
  if (composition.parameters.season > 0.72) materials.push(t('stagione in riposo', 'resting season'))
  return materials.length > 0 ? materials : [t('terra, legno e luce minimale', 'earth, timber and minimal light')]
}
