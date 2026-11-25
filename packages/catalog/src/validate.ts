import type { AcousticSpeakerProfile } from '@aura-spec/core-acoustics'
import { shCoefficientCount } from '@aura-spec/core-acoustics'

export interface CatalogIssue {
  severity: 'error' | 'warning'
  path: string
  message: string
}

export interface CatalogValidation {
  valid: boolean
  issues: CatalogIssue[]
}

export function validateSpeakerProfile(profile: AcousticSpeakerProfile): CatalogValidation {
  const issues: CatalogIssue[] = []
  const error = (path: string, message: string): void => {
    issues.push({ severity: 'error', path, message })
  }
  const warning = (path: string, message: string): void => {
    issues.push({ severity: 'warning', path, message })
  }

  if (profile.schemaVersion !== '1.0.0') error('schemaVersion', 'Expected schemaVersion 1.0.0')
  if (!profile.id) error('id', 'Profile id is required')
  if (!profile.model.code) error('model.code', 'Model code is required')

  const bands = profile.acoustics.bandsHz
  if (!isAscending(bands)) error('acoustics.bandsHz', 'Bands must be strictly ascending')
  for (const [name, series] of Object.entries({
    sensitivity: profile.acoustics.sensitivityDbSpl1W1m,
    maxSpl: profile.acoustics.maxSplDb,
    impedance: profile.acoustics.impedanceOhm,
  })) {
    if (series.frequenciesHz.length !== seriesLength(series)) error(`acoustics.${name}`, 'Frequency/value length mismatch')
    if (!isAscending(series.frequenciesHz)) error(`acoustics.${name}.frequenciesHz`, 'Frequencies must be ascending')
    if (series.values.some((value) => !Number.isFinite(value))) error(`acoustics.${name}.values`, 'Non-finite value')
  }

  const power = profile.acoustics.powerHandlingW
  if (power.rmsW <= 0) error('acoustics.powerHandlingW.rmsW', 'RMS power must be positive')
  if (power.peakW !== undefined && power.peakW < power.rmsW) {
    error('acoustics.powerHandlingW.peakW', 'Peak power must be >= RMS power')
  }

  const directivity = profile.acoustics.directivity
  if (directivity.kind === 'grid') {
    if (!directivity.grid) error('acoustics.directivity.grid', 'Grid directivity requires a grid')
    else {
      const grid = directivity.grid
      if (grid.valuesDb.length !== grid.frequenciesHz.length) {
        error('acoustics.directivity.grid.valuesDb', 'Band count mismatch')
      }
      for (let band = 0; band < grid.valuesDb.length; band += 1) {
        if (grid.valuesDb[band]!.length !== grid.elevationsDeg.length) {
          error(`acoustics.directivity.grid.valuesDb[${band}]`, 'Elevation count mismatch')
        }
        for (const row of grid.valuesDb[band] ?? []) {
          if (row.length !== grid.azimuthsDeg.length) {
            error(`acoustics.directivity.grid.valuesDb[${band}]`, 'Azimuth count mismatch')
            break
          }
        }
      }
    }
  } else if (directivity.kind === 'sh') {
    if (!directivity.sh) error('acoustics.directivity.sh', 'SH directivity requires coefficients')
    else {
      const expected = shCoefficientCount(directivity.sh.order)
      if (directivity.sh.coefficients.some((band) => band.length !== expected)) {
        error('acoustics.directivity.sh.coefficients', `Expected ${expected} coefficients per band`)
      }
    }
  } else if (directivity.kind === 'parametric') {
    if (!directivity.parametric) error('acoustics.directivity.parametric', 'Parametric directivity requires a model')
  }

  if (profile.electrical.nominalImpedanceOhm !== undefined && profile.electrical.nominalImpedanceOhm <= 0) {
    error('electrical.nominalImpedanceOhm', 'Impedance must be positive')
  }
  if (!/^IP\d{2}$/i.test(profile.physical.ipRating)) {
    warning('physical.ipRating', `Unexpected IP rating "${profile.physical.ipRating}"`)
  }
  if (profile.provenance.verification === 'illustrative') {
    warning('provenance.verification', 'Illustrative data must not be used for final specification')
  }
  if (profile.files.gll === undefined && profile.files.clf === undefined) {
    warning('files', 'No GLL/CLF measurement file attached')
  }

  return { valid: issues.every((issue) => issue.severity !== 'error'), issues }
}

function seriesLength(series: { frequenciesHz: number[]; values: number[] }): number {
  return series.values.length
}

function isAscending(values: readonly number[]): boolean {
  for (let i = 1; i < values.length; i += 1) {
    if (values[i]! <= values[i - 1]!) return false
  }
  return true
}
