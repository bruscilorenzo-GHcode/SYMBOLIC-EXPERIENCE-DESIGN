import type { DirectivityNormalization, PolarGrid } from '../types/speaker'
import { angularDistanceDeg, toDegrees } from '../math/angles'
import { normalizePolarGrid } from './grid'

export type PolarValueUnit = 'db' | 'linear'
export type AngleUnit = 'deg' | 'rad'

export interface ParsePolarOptions {
  delimiter?: string
  /** Elevation used by single-plane tables that only carry azimuth columns. */
  defaultElevationDeg?: number
  /** Azimuth used by tables that only carry elevation columns. */
  defaultAzimuthDeg?: number
  angleUnit?: AngleUnit
  valueUnit?: PolarValueUnit
  normalization?: 'on-axis' | 'max' | 'none'
  referenceDistanceM?: number
  /** If set, resample the measured angles onto a regular grid at this step. */
  gridResolutionDeg?: number
  /** Number of nearest measured samples blended when a grid point is missing. */
  idwNeighbours?: number
}

export interface ParsedPolarTable {
  grid: PolarGrid
  metadata: Record<string, string>
  warnings: string[]
}

interface RawSample {
  azimuthDeg: number
  elevationDeg: number
  frequencyHz: number
  valueDb: number
}

/**
 * Parses manufacturer polar tables in CSV/TSV form.
 *
 * Supported layouts:
 *  1. `azimuth,63,125,...`               — one elevation plane
 *  2. `azimuth,elevation,63,125,...`     — full balloon samples
 *  3. `elevation,63,125,...`             — one azimuth plane
 *  4. `Hz,-180,-170,...`                 — frequencies as rows
 *  5. headerless numeric matrices         — first row frequencies, first column azimuth
 *
 * Metadata is read from leading `#` or `//` comments:
 *   `# normalization: on-axis-0db`
 *   `# reference_distance_m: 1`
 *   `# angle_unit: deg`
 *   `# value_unit: linear`
 */
export function parsePolarTable(text: string, options: ParsePolarOptions = {}): ParsedPolarTable {
  const warnings: string[] = []
  const metadata: Record<string, string> = {}
  const dataLines: string[] = []

  for (const rawLine of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = rawLine.replace(/^\uFEFF/, '').trim()
    if (!line) continue
    if (line.startsWith('#') || line.startsWith('//')) {
      const body = line.replace(/^#|^\/\//, '').trim()
      const match = /^([A-Za-z0-9_.-]+)\s*[:=]\s*(.+)$/.exec(body)
      if (match) metadata[match[1]!.toLowerCase()] = match[2]!.trim()
      continue
    }
    dataLines.push(line)
  }

  if (dataLines.length === 0) throw new Error('Polar table contains no data rows')

  const delimiter = options.delimiter ?? metadata.delimiter ?? detectDelimiter(dataLines[0]!)
  const angleUnit = options.angleUnit ?? parseAngleUnit(metadata.angle_unit) ?? 'deg'
  const valueUnit = options.valueUnit ?? parseValueUnit(metadata.value_unit ?? metadata.units) ?? 'db'
  const defaultElevation = options.defaultElevationDeg ?? numberMetadata(metadata.elevation_deg) ?? 0
  const defaultAzimuth = options.defaultAzimuthDeg ?? numberMetadata(metadata.azimuth_deg) ?? 0

  const rows = dataLines.map((line) => splitDelimited(line, delimiter))
  const header = rows[0]!
  const headerLooksNumeric = header.every(
    (cell, index) => parseNumeric(cell) !== null || (index === 0 && cell.trim() === ''),
  )

  const samples: RawSample[] = []

  if (headerLooksNumeric) {
    // Layout 5: no header. First row = frequencies, first column = azimuth.
    const frequencies = header.slice(1).map((cell, index) => {
      const value = parseNumeric(cell)
      if (value === null || value <= 0) throw new Error(`Invalid frequency in column ${index + 2}`)
      return value
    })
    for (let r = 1; r < rows.length; r += 1) {
      const row = rows[r]!
      const azimuth = parseAngle(row[0]!, angleUnit)
      for (let c = 1; c < row.length; c += 1) {
        const frequency = frequencies[c - 1]
        if (frequency === undefined) continue
        pushSample(samples, azimuth, defaultElevation, frequency, parseValue(row[c]!, valueUnit), warnings)
      }
    }
  } else {
    const normalizedHeader = header.map(normalizeHeader)
    const angleColumns = normalizedHeader
      .map((name, index) => ({ name, index }))
      .filter(({ name }) => isAngleColumn(name))
    const frequencyColumns = normalizedHeader
      .map((name, index) => ({ name, index }))
      .filter(({ name }) => isFrequencyColumn(name))

    const firstIsFrequency = frequencyColumns.some(({ index }) => index === 0)

    if (firstIsFrequency) {
      // Layout 4: frequencies as rows, angles as columns.
      const angleHeaders = normalizedHeader.slice(1)
      for (let r = 1; r < rows.length; r += 1) {
        const row = rows[r]!
        const frequency = parseNumeric(row[0]!)
        if (frequency === null || frequency <= 0) {
          warnings.push(`Row ${r + 1}: invalid frequency "${row[0] ?? ''}" — skipped`)
          continue
        }
        for (let c = 1; c < row.length; c += 1) {
          const angleHeader = angleHeaders[c - 1]
          if (angleHeader === undefined) continue
          const angle = parseNumeric(angleHeader)
          if (angle === null) continue
          const isElevation = angleHeader.includes('elev') || angleHeader === 'v'
          const azimuth = isElevation ? defaultAzimuth : parseAngleValue(angle, angleUnit)
          const elevation = isElevation ? parseAngleValue(angle, angleUnit) : defaultElevation
          pushSample(samples, azimuth, elevation, frequency, parseValue(row[c]!, valueUnit), warnings)
        }
      }
    } else if (angleColumns.length > 0 && frequencyColumns.length > 0) {
      // Layouts 1–3: rows are samples, columns are frequency bands.
      const azimuthColumn = angleColumns.find(({ name }) => name.includes('az') || name === 'h')
      const elevationColumn = angleColumns.find(({ name }) => name.includes('elev') || name === 'v')
      for (let r = 1; r < rows.length; r += 1) {
        const row = rows[r]!
        const azimuth = azimuthColumn
          ? parseAngle(row[azimuthColumn.index]!, angleUnit)
          : defaultAzimuth
        const elevation = elevationColumn
          ? parseAngle(row[elevationColumn.index]!, angleUnit)
          : defaultElevation
        for (const column of frequencyColumns) {
          const frequency = parseNumeric(header[column.index]!)
          if (frequency === null || frequency <= 0) continue
          const raw = row[column.index]
          if (raw === undefined || raw.trim() === '') continue
          pushSample(samples, azimuth, elevation, frequency, parseValue(raw, valueUnit), warnings)
        }
      }
    } else {
      // Layout with generic angle headers, e.g. `angle,63,125,...`:
      // interpret the first angle column as azimuth.
      const firstAngle = angleColumns[0]
      if (!firstAngle) throw new Error('Unable to identify angle or frequency columns in polar table')
      for (let r = 1; r < rows.length; r += 1) {
        const row = rows[r]!
        const angle = parseAngle(row[firstAngle.index]!, angleUnit)
        for (const column of frequencyColumns) {
          const frequency = parseNumeric(header[column.index]!)
          if (frequency === null || frequency <= 0) continue
          pushSample(samples, angle, defaultElevation, frequency, parseValue(row[column.index]!, valueUnit), warnings)
        }
      }
    }
  }

  if (samples.length === 0) throw new Error('No valid polar samples found')

  const frequencies = uniqueSorted(samples.map((sample) => sample.frequencyHz))
  let azimuths = uniqueSorted(samples.map((sample) => sample.azimuthDeg))
  let elevations = uniqueSorted(samples.map((sample) => sample.elevationDeg))

  if (azimuths.length === 1) {
    azimuths = [-180, -90, 0, 90, 180]
    warnings.push('Single azimuth column: assumed horizontal omnidirectional coverage')
  }
  if (elevations.length === 1) {
    elevations = [-90, 0, 90]
    warnings.push('Single elevation plane: mirrored to ±90° with the measured value')
  }
  if (azimuths[azimuths.length - 1]! - azimuths[0]! < 300) {
    warnings.push('Azimuth coverage is narrower than 300°; the missing rear sector is interpolated')
  }

  const resolution = options.gridResolutionDeg
  const targetAzimuths = resolution ? regularAngles(-180, 180, resolution, true) : azimuths
  const targetElevations = resolution ? regularAngles(-90, 90, resolution, false) : elevations

  const byFrequency = new Map<number, RawSample[]>()
  for (const sample of samples) {
    const list = byFrequency.get(sample.frequencyHz)
    if (list) list.push(sample)
    else byFrequency.set(sample.frequencyHz, [sample])
  }

  const neighbourCount = Math.max(1, options.idwNeighbours ?? 6)
  const valuesDb = frequencies.map((frequency) => {
    const bandSamples = byFrequency.get(frequency) ?? []
    return targetElevations.map((elevation) =>
      targetAzimuths.map((azimuth) => interpolateIdw(bandSamples, azimuth, elevation, neighbourCount)),
    )
  })

  const normalization = options.normalization ?? parseNormalization(metadata.normalization) ?? 'on-axis'
  let grid: PolarGrid = {
    frequenciesHz: frequencies,
    azimuthsDeg: targetAzimuths,
    elevationsDeg: targetElevations,
    valuesDb,
    normalization: normalization === 'max' ? 'max-0db' : normalization === 'none' ? 'absolute' : 'on-axis-0db',
    referenceDistanceM:
      options.referenceDistanceM ??
      numberMetadata(metadata.reference_distance_m ?? metadata.distance_m) ??
      1,
  }

  if (normalization !== 'none') grid = normalizePolarGrid(grid, normalization)

  return { grid, metadata, warnings }
}

export const parsePolarCsv = parsePolarTable

function detectDelimiter(line: string): string {
  const candidates = [',', '\t', ';', '|']
  let best = ','
  let bestCount = 0
  for (const candidate of candidates) {
    const count = line.split(candidate).length - 1
    if (count > bestCount) {
      best = candidate
      bestCount = count
    }
  }
  return best
}

function splitDelimited(line: string, delimiter: string): string[] {
  const cells: string[] = []
  let current = ''
  let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]!
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        quoted = !quoted
      }
    } else if (char === delimiter && !quoted) {
      cells.push(current)
      current = ''
    } else {
      current += char
    }
  }
  cells.push(current)
  return cells
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[()[\]]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function isAngleColumn(name: string): boolean {
  return (
    name === 'az' ||
    name === 'azimuth' ||
    name === 'azimuth_deg' ||
    name === 'h' ||
    name === 'horizontal' ||
    name === 'el' ||
    name === 'elev' ||
    name === 'elevation' ||
    name === 'elevation_deg' ||
    name === 'v' ||
    name === 'vertical' ||
    name === 'angle' ||
    name === 'angle_deg'
  )
}

function isFrequencyColumn(name: string): boolean {
  if (name === 'f' || name === 'freq' || name === 'frequency' || name === 'hz') return true
  if (name.startsWith('freq_') || name.startsWith('frequency_')) return true
  const numeric = parseNumeric(name)
  return numeric !== null && numeric > 0
}

function parseNumeric(value: string | undefined): number | null {
  if (value === undefined) return null
  const text = value.trim()
  if (!text) return null
  const parsed = Number(text.replace(/[^\d.eE+-]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

function parseAngle(value: string, unit: AngleUnit): number {
  const numeric = parseNumeric(value)
  if (numeric === null) throw new Error(`Invalid angle "${value}"`)
  return parseAngleValue(numeric, unit)
}

function parseAngleValue(value: number, unit: AngleUnit): number {
  return unit === 'rad' ? toDegrees(value) : value
}

function parseValue(value: string, unit: PolarValueUnit): number {
  const numeric = parseNumeric(value)
  if (numeric === null) return Number.NEGATIVE_INFINITY
  if (unit === 'linear') return 20 * Math.log10(Math.max(numeric, 1e-12))
  return numeric
}

function parseAngleUnit(value: string | undefined): AngleUnit | null {
  if (!value) return null
  const normalized = value.toLowerCase()
  if (normalized === 'rad' || normalized === 'radian' || normalized === 'radians') return 'rad'
  if (normalized === 'deg' || normalized === 'degree' || normalized === 'degrees') return 'deg'
  return null
}

function parseValueUnit(value: string | undefined): PolarValueUnit | null {
  if (!value) return null
  const normalized = value.toLowerCase()
  if (normalized === 'linear' || normalized === 'amplitude' || normalized === 'ratio') return 'linear'
  if (normalized === 'db' || normalized === 'decibel' || normalized === 'dbspl') return 'db'
  return null
}

function parseNormalization(value: string | undefined): 'on-axis' | 'max' | 'none' | null {
  if (!value) return null
  const normalized = value.toLowerCase()
  if (normalized.includes('on') || normalized.includes('axis')) return 'on-axis'
  if (normalized.includes('max')) return 'max'
  if (normalized.includes('abs') || normalized.includes('none')) return 'none'
  return null
}

function numberMetadata(value: string | undefined): number | null {
  return value ? parseNumeric(value) : null
}

function uniqueSorted(values: number[]): number[] {
  return [...new Set(values.map((value) => Math.round(value * 1e6) / 1e6))].sort((a, b) => a - b)
}

function regularAngles(start: number, end: number, step: number, exclusiveEnd: boolean): number[] {
  const count = Math.floor((end - start) / step) + (exclusiveEnd ? 0 : 1)
  return Array.from({ length: Math.max(2, count) }, (_, index) => start + index * step)
}

function pushSample(
  samples: RawSample[],
  azimuthDeg: number,
  elevationDeg: number,
  frequencyHz: number,
  valueDb: number,
  warnings: string[],
): void {
  if (!Number.isFinite(valueDb)) {
    warnings.push(`Non-finite value at ${azimuthDeg}°/${elevationDeg}° ${frequencyHz} Hz — skipped`)
    return
  }
  if (elevationDeg < -90 || elevationDeg > 90) {
    warnings.push(`Elevation ${elevationDeg}° outside [-90, 90] — clamped`)
  }
  samples.push({
    azimuthDeg,
    elevationDeg: Math.min(90, Math.max(-90, elevationDeg)),
    frequencyHz,
    valueDb,
  })
}

/**
 * Inverse-distance weighting on the sphere. Exact grid hits short-circuit,
 * which preserves measured values and avoids smoothing artefacts.
 */
function interpolateIdw(samples: RawSample[], azimuthDeg: number, elevationDeg: number, neighbours: number): number {
  if (samples.length === 0) return 0
  const scored = samples
    .map((sample) => ({
      value: sample.valueDb,
      distance: angularDistanceDeg(azimuthDeg, elevationDeg, sample.azimuthDeg, sample.elevationDeg),
    }))
    .sort((a, b) => a.distance - b.distance)

  if (scored[0]!.distance < 0.25) return scored[0]!.value

  let weightSum = 0
  let valueSum = 0
  for (let i = 0; i < Math.min(neighbours, scored.length); i += 1) {
    const item = scored[i]!
    const weight = 1 / (item.distance * item.distance + 1e-6)
    weightSum += weight
    valueSum += item.value * weight
  }
  return valueSum / weightSum
}
