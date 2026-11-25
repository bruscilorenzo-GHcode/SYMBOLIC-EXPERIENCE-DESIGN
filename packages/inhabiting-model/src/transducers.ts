import type { AcousticTransducerSpec } from './types'

/**
 * Physical transducer specifications bound to the Tier 1 personae. Polar
 * behaviour, power and BOM data resolve through the catalogue profiles; this
 * layer adds the engineering identity that the Spec Lab needs.
 */
export const ACOUSTIC_TRANSDUCER_SPECS: AcousticTransducerSpec[] = [
  {
    id: 'transducer-as-omni-01',
    personaKinds: ['omni-cloud'],
    manufacturer: 'Architettura Sonora',
    model: 'Reference Omni 01',
    speakerProfileId: 'as-reference-omni-01',
    transducerClass: 'omnidirectional',
    sensitivityDbSpl1W1m: 89,
    maxSplDb: 112,
    powerHandlingW: 60,
    nominalImpedanceOhm: 8,
    dispersionDeg: { horizontal: 360, vertical: 180 },
    ipRating: 'IP66',
    polarSource: 'illustrative',
    mounting: 'Ground / buried foundation ring',
    notes: 'Sculptural stone/mass body with 360° horizontal acoustic reflector; ambient diffuse bed.',
  },
  {
    id: 'transducer-as-lens-01',
    personaKinds: ['directional-voice', 'asymmetric-lens'],
    manufacturer: 'Architettura Sonora',
    model: 'Reference Lens 01',
    speakerProfileId: 'as-reference-lens-01',
    transducerClass: 'lens',
    sensitivityDbSpl1W1m: 91,
    maxSplDb: 118,
    powerHandlingW: 100,
    nominalImpedanceOhm: 8,
    dispersionDeg: { horizontal: 120, vertical: 55 },
    ipRating: 'IP65',
    polarSource: 'illustrative',
    mounting: 'Ground / pole adapter',
    notes: 'Acoustic lens with asymmetric projection along walls, water surfaces and foliage.',
  },
  {
    id: 'transducer-karray-sub-18',
    personaKinds: ['sub-sculpture'],
    manufacturer: 'K-ARRAY',
    model: 'Reference Sub 18',
    speakerProfileId: 'karray-reference-sub-18',
    transducerClass: 'subwoofer',
    sensitivityDbSpl1W1m: 92,
    maxSplDb: 122,
    powerHandlingW: 600,
    nominalImpedanceOhm: 8,
    dispersionDeg: { horizontal: 360, vertical: 180 },
    ipRating: 'IP55',
    polarSource: 'illustrative',
    mounting: 'Ground / buried vault',
    notes: 'Architectural subwoofer for ground-coupled low frequency; tactile, organic vibration.',
  },
  {
    id: 'transducer-karray-line-8',
    personaKinds: ['architectural-line'],
    manufacturer: 'K-ARRAY',
    model: 'Reference Line 8',
    speakerProfileId: 'karray-reference-line-8',
    transducerClass: 'line-array',
    sensitivityDbSpl1W1m: 96,
    maxSplDb: 125,
    powerHandlingW: 400,
    nominalImpedanceOhm: 16,
    dispersionDeg: { horizontal: 120, vertical: 50 },
    ipRating: 'IP54',
    polarSource: 'illustrative',
    mounting: 'Wall bracket / pole, electronic beam steering',
    notes: 'Slim architectural line array; cylindrical near field, steerable vertical coverage.',
  },
]

export function getTransducerForPersona(personaId: string): AcousticTransducerSpec | undefined {
  return ACOUSTIC_TRANSDUCER_SPECS.find((spec) => spec.personaKinds.includes(personaId as never))
}

export function requireTransducerForPersona(personaId: string): AcousticTransducerSpec {
  const spec = getTransducerForPersona(personaId)
  if (!spec) throw new Error(`No transducer spec bound to persona "${personaId}"`)
  return spec
}
