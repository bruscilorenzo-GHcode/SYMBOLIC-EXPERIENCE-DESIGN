import type { AcousticSpeakerProfile, BandSeries, PolarDataSet } from '@aura-spec/core-acoustics'
import { OCTAVE_BANDS_HZ } from '@aura-spec/core-acoustics'

const BANDS = [...OCTAVE_BANDS_HZ]

function band(values: number[]): BandSeries {
  return { frequenciesHz: [...BANDS], values }
}

function polar(parametric: NonNullable<PolarDataSet['parametric']>): PolarDataSet {
  return {
    kind: 'parametric',
    normalization: 'on-axis-0db',
    referenceDistanceM: 1,
    parametric,
    sourceFormat: 'synthetic',
  }
}

const ILLUSTRATIVE = {
  retrievedAt: '2026-10-22T00:00:00.000Z',
  license: 'Illustrative engineering placeholder — not a manufacturer specification',
  verification: 'illustrative' as const,
  notes:
    'Synthetic reference data for software development. Replace with the manufacturer GLL/CLF or measured polar balloons before any project specification.',
}

/**
 * Seed profiles. They intentionally use fictional model codes and clearly
 * illustrative numbers: they exercise the schema and the renderer without
 * misrepresenting a real product's sensitivity, directivity or power handling.
 */
export const REFERENCE_PROFILES: AcousticSpeakerProfile[] = [
  {
    schemaVersion: '1.0.0',
    id: 'as-reference-omni-01',
    manufacturer: {
      id: 'architettura-sonora',
      name: 'Architettura Sonora',
      website: 'https://www.architetturasonora.com',
      country: 'IT',
    },
    model: {
      name: 'Reference Omni 01',
      code: 'AS-OMNI-REF-01',
      family: 'Sculptural outdoor',
      series: 'Reference',
      description:
        'Illustrative omnidirectional stone/concrete loudspeaker for garden and courtyard studies. Replace with certified data.',
    },
    kind: 'omnidirectional',
    tags: ['outdoor', 'sculptural', 'omni', 'stone', 'garden'],
    acoustics: {
      bandsHz: [...BANDS],
      sensitivityDbSpl1W1m: band([84, 86, 88, 89, 89, 88, 86, 84, 80]),
      maxSplDb: band([102, 106, 109, 111, 112, 111, 109, 106, 100]),
      impedanceOhm: band([8, 8, 8, 8, 8, 8, 8, 8, 8]),
      powerHandlingW: { rmsW: 60, programW: 120, peakW: 240 },
      directivity: polar({ model: 'omnidirectional' }),
      nominalDispersionDeg: { horizontal: 360, vertical: 180 },
      lowFrequencyExtensionHz: 63,
    },
    electrical: {
      configuration: 'low-z',
      nominalImpedanceOhm: 8,
      connector: 'IP68 cable gland / terminal block',
      recommendedAmplifierPowerW: 120,
      maxCurrentA: 4,
    },
    physical: {
      dimensionsM: { width: 0.42, height: 0.92, depth: 0.42 },
      weightKg: 38,
      materials: ['cast stone', 'stainless steel', 'mineral composite'],
      ipRating: 'IP66',
      operatingTemperatureC: { min: -10, max: 55 },
      mountingPoints: ['M8 base plate', 'buried foundation ring'],
      colorOptions: ['#b8b0a1', '#6f6a61', '#2f3330'],
    },
    accessories: [
      {
        id: 'as-omni-base',
        name: 'Foundation base plate',
        type: 'mount',
        included: true,
        loadRatingKg: 120,
      },
      {
        id: 'as-omni-weather',
        name: 'Marine weather shield',
        type: 'weather-shield',
        included: false,
        ipRating: 'IP66',
      },
    ],
    files: {},
    provenance: {
      ...ILLUSTRATIVE,
      source: 'AURA-SPEC reference catalogue',
      sourceUrl: 'https://www.architetturasonora.com',
    },
    extensions: { catalogRole: 'reference', replaceBeforeSpecification: true },
  },
  {
    schemaVersion: '1.0.0',
    id: 'as-reference-lens-01',
    manufacturer: {
      id: 'architettura-sonora',
      name: 'Architettura Sonora',
      website: 'https://www.architetturasonora.com',
      country: 'IT',
    },
    model: {
      name: 'Reference Lens 01',
      code: 'AS-LENS-REF-01',
      family: 'Sculptural outdoor',
      series: 'Reference',
      description:
        'Illustrative acoustic-lens profile with asymmetric horizontal coverage for façade and landscape studies.',
    },
    kind: 'acoustic-lens',
    tags: ['outdoor', 'sculptural', 'lens', 'directional', 'landscape'],
    acoustics: {
      bandsHz: [...BANDS],
      sensitivityDbSpl1W1m: band([86, 88, 90, 91, 91, 90, 89, 86, 82]),
      maxSplDb: band([108, 112, 115, 117, 118, 117, 115, 111, 104]),
      impedanceOhm: band([8, 8, 8, 8, 8, 8, 8, 8, 8]),
      powerHandlingW: { rmsW: 100, programW: 200, peakW: 400 },
      directivity: polar({ model: 'lens', horizontalBeamwidthDeg: 120, verticalBeamwidthDeg: 55, rearAttenuationDb: 18 }),
      nominalDispersionDeg: { horizontal: 120, vertical: 55 },
      lens: {
        type: 'acoustic-lens',
        diffusionModel: 'measured-polar',
        notes: 'Illustrative beamwidth; use the measured balloon for final coverage.',
      },
    },
    electrical: {
      configuration: 'low-z',
      nominalImpedanceOhm: 8,
      connector: 'IP68 cable gland',
      recommendedAmplifierPowerW: 200,
      maxCurrentA: 6,
    },
    physical: {
      dimensionsM: { width: 0.55, height: 0.7, depth: 0.6 },
      weightKg: 44,
      materials: ['cast stone', 'mineral composite', 'stainless steel'],
      ipRating: 'IP65',
      operatingTemperatureC: { min: -10, max: 55 },
      mountingPoints: ['M10 base', 'pole adapter'],
      colorOptions: ['#b8b0a1', '#5c5b57'],
    },
    accessories: [
      { id: 'as-lens-pole', name: 'Pole adapter', type: 'bracket', included: false, loadRatingKg: 80 },
    ],
    files: {},
    provenance: {
      ...ILLUSTRATIVE,
      source: 'AURA-SPEC reference catalogue',
      sourceUrl: 'https://www.architetturasonora.com',
    },
    extensions: { catalogRole: 'reference', replaceBeforeSpecification: true },
  },
  {
    schemaVersion: '1.0.0',
    id: 'karray-reference-line-8',
    manufacturer: {
      id: 'k-array',
      name: 'K-ARRAY',
      website: 'https://www.k-array.com',
      country: 'IT',
    },
    model: {
      name: 'Reference Line 8',
      code: 'KARRAY-LA-REF-8',
      family: 'Slim line array',
      series: 'Reference',
      description:
        'Illustrative eight-element slim line array with electronic steering, cylindrical near field and architectural subwoofer companion.',
    },
    kind: 'line-array',
    tags: ['line-array', 'slim', 'beam-steering', 'architectural', 'indoor', 'outdoor'],
    acoustics: {
      bandsHz: [...BANDS],
      sensitivityDbSpl1W1m: band([88, 91, 94, 96, 97, 96, 94, 91, 86]),
      maxSplDb: band([112, 116, 120, 123, 125, 124, 121, 116, 108]),
      impedanceOhm: band([16, 16, 16, 16, 16, 16, 16, 16, 16]),
      powerHandlingW: { rmsW: 400, programW: 800, peakW: 1600 },
      directivity: polar({
        model: 'line-array',
        lengthM: 1.2,
        elementCount: 8,
        elementSpacingM: 0.15,
        steerDeg: 0,
        verticalWindowDeg: 50,
      }),
      nominalDispersionDeg: { horizontal: 120, vertical: 50 },
      lineArray: {
        lengthM: 1.2,
        elementCount: 8,
        elementSpacingM: 0.15,
        wavefront: 'cylindrical',
        beamSteering: {
          supported: true,
          maxAngleDeg: 45,
          resolutionDeg: 0.5,
          latencySamples: 48,
          processingRateHz: 48000,
        },
        pat: {
          supported: true,
          notes: 'Technology label only; coverage is driven by the measured polar balloon.',
        },
        nearFieldModel: 'cylindrical-to-spherical',
      },
    },
    electrical: {
      configuration: 'self-powered',
      nominalImpedanceOhm: 16,
      connector: 'PowerCON TRUE1 + XLR / Dante optional',
      recommendedAmplifierPowerW: 800,
      maxCurrentA: 8,
      dante: {
        channels: 2,
        sampleRatesHz: [48000, 96000],
        redundancy: 'primary-secondary',
        poe: false,
      },
      aes67: true,
    },
    physical: {
      dimensionsM: { width: 0.08, height: 1.2, depth: 0.12 },
      weightKg: 12,
      materials: ['aluminium', 'steel', 'weatherproof grille'],
      ipRating: 'IP54',
      operatingTemperatureC: { min: -20, max: 50 },
      mountingPoints: ['M6 top/bottom', 'wall bracket rail'],
      colorOptions: ['#111111', '#f2f2f2', '#8a8f93'],
    },
    accessories: [
      { id: 'karray-line-bracket', name: 'Pan/tilt wall bracket', type: 'bracket', included: false, loadRatingKg: 30 },
      { id: 'karray-line-weather', name: 'Outdoor rain cover', type: 'weather-shield', included: false, ipRating: 'IP55' },
    ],
    files: {},
    provenance: {
      ...ILLUSTRATIVE,
      source: 'AURA-SPEC reference catalogue',
      sourceUrl: 'https://www.k-array.com',
    },
    extensions: { catalogRole: 'reference', replaceBeforeSpecification: true },
  },
  {
    schemaVersion: '1.0.0',
    id: 'karray-reference-sub-18',
    manufacturer: {
      id: 'k-array',
      name: 'K-ARRAY',
      website: 'https://www.k-array.com',
      country: 'IT',
    },
    model: {
      name: 'Reference Sub 18',
      code: 'KARRAY-SUB-REF-18',
      family: 'Architectural subwoofer',
      series: 'Reference',
      description: 'Illustrative architectural subwoofer for low-frequency support in landscape and indoor zones.',
    },
    kind: 'subwoofer',
    tags: ['subwoofer', 'architectural', 'low-frequency', 'outdoor'],
    acoustics: {
      bandsHz: [...BANDS],
      sensitivityDbSpl1W1m: band([82, 86, 89, 91, 92, 92, 90, 86, 80]),
      maxSplDb: band([108, 113, 117, 120, 122, 121, 118, 111, 102]),
      impedanceOhm: band([8, 8, 8, 8, 8, 8, 8, 8, 8]),
      powerHandlingW: { rmsW: 600, programW: 1200, peakW: 2400 },
      directivity: polar({ model: 'omnidirectional' }),
      nominalDispersionDeg: { horizontal: 360, vertical: 180 },
      lowFrequencyExtensionHz: 35,
    },
    electrical: {
      configuration: 'low-z',
      nominalImpedanceOhm: 8,
      connector: 'SpeakON / terminal block',
      recommendedAmplifierPowerW: 1200,
      maxCurrentA: 12,
    },
    physical: {
      dimensionsM: { width: 0.6, height: 0.7, depth: 0.55 },
      weightKg: 48,
      materials: ['aluminium', 'steel', 'mineral composite'],
      ipRating: 'IP55',
      operatingTemperatureC: { min: -20, max: 50 },
      mountingPoints: ['M8 base', 'buried vault'],
      colorOptions: ['#111111', '#6f6a61'],
    },
    accessories: [
      { id: 'karray-sub-vault', name: 'Buried acoustic vault', type: 'mount', included: false, ipRating: 'IP67' },
    ],
    files: {},
    provenance: {
      ...ILLUSTRATIVE,
      source: 'AURA-SPEC reference catalogue',
      sourceUrl: 'https://www.k-array.com',
    },
    extensions: { catalogRole: 'reference', replaceBeforeSpecification: true },
  },
]

export const CATALOG_SEED = {
  schemaVersion: '1.0.0' as const,
  generatedAt: '2026-10-22T00:00:00.000Z',
  manufacturers: [
    {
      manufacturerId: 'architettura-sonora',
      name: 'Architettura Sonora',
      website: 'https://www.architetturasonora.com',
      license: ILLUSTRATIVE.license,
      lastSyncedAt: ILLUSTRATIVE.retrievedAt,
      profileCount: REFERENCE_PROFILES.filter((profile) => profile.manufacturer.id === 'architettura-sonora').length,
    },
    {
      manufacturerId: 'k-array',
      name: 'K-ARRAY',
      website: 'https://www.k-array.com',
      license: ILLUSTRATIVE.license,
      lastSyncedAt: ILLUSTRATIVE.retrievedAt,
      profileCount: REFERENCE_PROFILES.filter((profile) => profile.manufacturer.id === 'k-array').length,
    },
  ],
  profiles: REFERENCE_PROFILES,
}
