export interface DrawingEntity {
  id: string
  /** Plan coordinates in drawing units before transform. */
  points: [number, number][]
  closed: boolean
  layer?: string
}

export interface DrawingParseResult {
  entities: DrawingEntity[]
  warnings: string[]
}

export interface DrawingTransformOptions {
  /** Drawing units → metres. 0.001 for mm, 0.01 for cm, 1 for m. */
  unitScale?: number
  /** Fit the drawing into a site footprint, optionally with padding. */
  fit?: { widthM: number; depthM: number; paddingM?: number }
  offsetXM?: number
  offsetZM?: number
  rotationDeg?: number
  /** Mirror the Z axis (screen coordinates). */
  flipZ?: boolean
}

export function parseDxf(text: string): DrawingParseResult {
  const pairs = dxfPairs(text)
  const warnings: string[] = []
  const raw: { type: string; pairs: { code: number; value: string }[] }[] = []
  let current: { type: string; pairs: { code: number; value: string }[] } | null = null
  let inEntities = false

  for (let i = 0; i < pairs.length; i += 1) {
    const pair = pairs[i]!
    if (pair.code === 0 && pair.value === 'SECTION') {
      const next = pairs[i + 1]
      inEntities = next?.code === 2 && next.value === 'ENTITIES'
      continue
    }
    if (pair.code === 0 && pair.value === 'ENDSEC') {
      if (current) {
        raw.push(current)
        current = null
      }
      inEntities = false
      continue
    }
    if (!inEntities) continue
    if (pair.code === 0) {
      if (current) raw.push(current)
      if (pair.value === 'EOF') {
        current = null
        break
      }
      current = { type: pair.value, pairs: [] }
    } else if (current) {
      current.pairs.push(pair)
    }
  }
  if (current) raw.push(current)

  const entities: DrawingEntity[] = []
  let index = 0
  for (let i = 0; i < raw.length; i += 1) {
    const item = raw[i]!
    const layer = stringCode(item.pairs, 8)
    if (item.type === 'LINE') {
      const points = linePoints(item.pairs)
      if (points) {
        index += 1
        entities.push({ id: `dxf-${index}`, points, closed: false, layer })
      }
    } else if (item.type === 'LWPOLYLINE') {
      const points = orderedPoints(item.pairs)
      if (points.length >= 2) {
        index += 1
        entities.push({
          id: `dxf-${index}`,
          points,
          closed: (numberCode(item.pairs, 70) ?? 0) % 2 === 1,
          layer,
        })
      }
    } else if (item.type === 'CIRCLE') {
      const circle = circleEntity(item.pairs)
      if (circle) {
        index += 1
        entities.push({ id: `dxf-${index}`, points: circle, closed: true, layer })
      }
    } else if (item.type === 'ARC') {
      const arc = arcEntity(item.pairs)
      if (arc) {
        index += 1
        entities.push({ id: `dxf-${index}`, points: arc, closed: false, layer })
      }
    } else if (item.type === 'POLYLINE') {
      const vertices: [number, number][] = []
      let closed = (numberCode(item.pairs, 70) ?? 0) % 2 === 1
      let j = i + 1
      for (; j < raw.length; j += 1) {
        const next = raw[j]!
        if (next.type === 'VERTEX') {
          const point = pointCode(next.pairs, 10, 20)
          if (point) vertices.push(point)
        } else if (next.type === 'SEQEND') {
          break
        }
      }
      if (vertices.length >= 2) {
        index += 1
        entities.push({ id: `dxf-${index}`, points: vertices, closed, layer })
      }
      i = j
    } else if (!['VERTEX', 'SEQEND', 'TEXT', 'MTEXT', 'INSERT', 'DIMENSION', 'HATCH'].includes(item.type)) {
      if (!warnings.includes(`Unsupported DXF entity ${item.type}`)) {
        warnings.push(`Unsupported DXF entity ${item.type}`)
      }
    }
  }

  if (entities.length === 0) warnings.push('No supported DXF geometry found in ENTITIES section')
  return { entities, warnings }
}

export function parseSvg(text: string): DrawingParseResult {
  const entities: DrawingEntity[] = []
  const warnings: string[] = []
  const elementPattern = /<(line|polyline|polygon|rect|circle)\b([^>]*?)\/?>/gi
  let match: RegExpExecArray | null
  let index = 0

  while ((match = elementPattern.exec(text))) {
    const tag = match[1]!.toLowerCase()
    const attrs = parseAttributes(match[2] ?? '')
    let points: [number, number][] = []
    let closed = false
    if (tag === 'line') {
      const x1 = num(attrs.x1)
      const y1 = num(attrs.y1)
      const x2 = num(attrs.x2)
      const y2 = num(attrs.y2)
      if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
        points = [[x1, -y1], [x2, -y2]]
      }
    } else if (tag === 'polyline' || tag === 'polygon') {
      points = parsePoints(attrs.points ?? '').map(([x, y]) => [x, -y])
      closed = tag === 'polygon'
    } else if (tag === 'rect') {
      const x = num(attrs.x) ?? 0
      const y = num(attrs.y) ?? 0
      const width = num(attrs.width)
      const height = num(attrs.height)
      if (width !== null && height !== null) {
        points = [
          [x, -y],
          [x + width, -y],
          [x + width, -(y + height)],
          [x, -(y + height)],
        ]
        closed = true
      }
    } else if (tag === 'circle') {
      const cx = num(attrs.cx)
      const cy = num(attrs.cy)
      const r = num(attrs.r)
      if (cx !== null && cy !== null && r !== null && r > 0) {
        points = circlePoints(cx, cy, r, 48).map(([x, y]) => [x, -y])
        closed = true
      }
    }
    if (points.length >= 2) {
      index += 1
      entities.push({ id: `svg-${index}`, points, closed, layer: attrs['data-layer'] })
    }
  }

  if (entities.length === 0) warnings.push('No supported SVG primitives found (line, polyline, polygon, rect, circle)')
  return { entities, warnings }
}

export function parseDrawingJson(text: string): DrawingParseResult {
  const parsed: unknown = JSON.parse(text)
  const warnings: string[] = []
  if (!Array.isArray(parsed)) return { entities: [], warnings: ['Expected an array of drawing entities'] }
  const entities: DrawingEntity[] = []
  parsed.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') return
    const record = entry as { points?: unknown; closed?: unknown; layer?: unknown; type?: unknown }
    if (!Array.isArray(record.points)) return
    const points = record.points
      .filter((point): point is [number, number] => Array.isArray(point) && point.length >= 2)
      .map((point) => [Number(point[0]), Number(point[1])] as [number, number])
      .filter((point) => Number.isFinite(point[0]) && Number.isFinite(point[1]))
    if (points.length >= 2) {
      entities.push({
        id: `json-${index + 1}`,
        points,
        closed: Boolean(record.closed),
        layer: typeof record.layer === 'string' ? record.layer : undefined,
      })
    }
  })
  if (entities.length === 0) warnings.push('No valid entity with at least two points found')
  return { entities, warnings }
}

export function transformDrawing(
  entities: readonly DrawingEntity[],
  options: DrawingTransformOptions = {},
): DrawingEntity[] {
  if (entities.length === 0) return []
  const bbox = drawingBounds(entities)
  if (!bbox) return []
  const sourceWidth = Math.max(bbox.maxX - bbox.minX, 1e-9)
  const sourceDepth = Math.max(bbox.maxZ - bbox.minZ, 1e-9)
  const padding = options.fit?.paddingM ?? 0
  const fitScale = options.fit
    ? Math.min(
        Math.max(1e-9, (options.fit.widthM - padding * 2) / sourceWidth),
        Math.max(1e-9, (options.fit.depthM - padding * 2) / sourceDepth),
      )
    : 1
  const scale = (options.unitScale ?? 1) * fitScale
  const centreX = (bbox.minX + bbox.maxX) / 2
  const centreZ = (bbox.minZ + bbox.maxZ) / 2
  const angle = ((options.rotationDeg ?? 0) * Math.PI) / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  return entities.map((entity) => ({
    ...entity,
    points: entity.points.map(([x, z]) => {
      const localX = (x - centreX) * scale
      const localZ = (z - centreZ) * scale * (options.flipZ ? -1 : 1)
      const rotatedX = localX * cos - localZ * sin
      const rotatedZ = localX * sin + localZ * cos
      return [
        Math.round((rotatedX + (options.offsetXM ?? 0)) * 1000) / 1000,
        Math.round((rotatedZ + (options.offsetZM ?? 0)) * 1000) / 1000,
      ]
    }),
  }))
}

export function drawingBounds(
  entities: readonly DrawingEntity[],
): { minX: number; maxX: number; minZ: number; maxZ: number } | null {
  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minZ = Number.POSITIVE_INFINITY
  let maxZ = Number.NEGATIVE_INFINITY
  for (const entity of entities) {
    for (const [x, z] of entity.points) {
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minZ = Math.min(minZ, z)
      maxZ = Math.max(maxZ, z)
    }
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minZ)) return null
  return { minX, maxX, minZ, maxZ }
}

function dxfPairs(text: string): { code: number; value: string }[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const pairs: { code: number; value: string }[] = []
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = Number(lines[i]!.trim())
    const value = lines[i + 1]!.trim()
    if (!Number.isFinite(code)) continue
    pairs.push({ code, value })
  }
  return pairs
}

function numberCode(pairs: readonly { code: number; value: string }[], code: number): number | null {
  for (let i = pairs.length - 1; i >= 0; i -= 1) {
    if (pairs[i]!.code === code) {
      const value = Number(pairs[i]!.value)
      return Number.isFinite(value) ? value : null
    }
  }
  return null
}

function stringCode(pairs: readonly { code: number; value: string }[], code: number): string | undefined {
  return pairs.find((pair) => pair.code === code)?.value
}

function pointCode(
  pairs: readonly { code: number; value: string }[],
  xCode: number,
  zCode: number,
): [number, number] | null {
  const x = numberCode(pairs, xCode)
  const z = numberCode(pairs, zCode)
  return x === null || z === null ? null : [x, z]
}

function linePoints(pairs: readonly { code: number; value: string }[]): [number, number][] | null {
  const start = pointCode(pairs, 10, 20)
  const end = pointCode(pairs, 11, 21)
  return start && end ? [start, end] : null
}

function orderedPoints(pairs: readonly { code: number; value: string }[]): [number, number][] {
  const points: [number, number][] = []
  let pendingX: number | null = null
  for (const pair of pairs) {
    if (pair.code === 10) {
      const value = Number(pair.value)
      pendingX = Number.isFinite(value) ? value : null
    } else if (pair.code === 20 && pendingX !== null) {
      const value = Number(pair.value)
      if (Number.isFinite(value)) points.push([pendingX, value])
      pendingX = null
    }
  }
  return points
}

function circleEntity(pairs: readonly { code: number; value: string }[]): [number, number][] | null {
  const centre = pointCode(pairs, 10, 20)
  const radius = numberCode(pairs, 40)
  if (!centre || radius === null || radius <= 0) return null
  return circlePoints(centre[0], centre[1], radius, 48)
}

function arcEntity(pairs: readonly { code: number; value: string }[]): [number, number][] | null {
  const centre = pointCode(pairs, 10, 20)
  const radius = numberCode(pairs, 40)
  const start = numberCode(pairs, 50)
  const end = numberCode(pairs, 51)
  if (!centre || radius === null || radius <= 0 || start === null || end === null) return null
  let sweep = end - start
  if (sweep <= 0) sweep += 360
  const steps = Math.max(8, Math.round(sweep / 7.5))
  const points: [number, number][] = []
  for (let i = 0; i <= steps; i += 1) {
    const angle = ((start + (sweep * i) / steps) * Math.PI) / 180
    points.push([centre[0] + radius * Math.cos(angle), centre[1] + radius * Math.sin(angle)])
  }
  return points
}

function circlePoints(cx: number, cy: number, radius: number, steps: number): [number, number][] {
  return Array.from({ length: steps }, (_, index) => {
    const angle = (2 * Math.PI * index) / steps
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]
  })
}

function parseAttributes(source: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const pattern = /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*"([^"]*)"/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(source))) attrs[match[1]!] = match[2]!
  return attrs
}

function parsePoints(source: string): [number, number][] {
  const numbers = source
    .split(/[\s,]+/)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
  const points: [number, number][] = []
  for (let i = 0; i + 1 < numbers.length; i += 2) points.push([numbers[i]!, numbers[i + 1]!])
  return points
}

function num(value: string | undefined): number | null {
  if (value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}
