import { describe, expect, it } from 'vitest'
import {
  drawingBounds,
  parseDrawingJson,
  parseDxf,
  parseSvg,
  transformDrawing,
} from '../src'

const DXF = `0
SECTION
2
ENTITIES
0
LINE
8
WALLS
10
0
20
0
11
10
21
0
0
LWPOLYLINE
8
ROOM
90
4
70
1
10
0
20
0
10
6
20
0
10
6
20
4
10
0
20
4
0
CIRCLE
10
3
20
2
40
1.5
0
ENDSEC
0
EOF`

describe('technical drawing import', () => {
  it('parses DXF lines, closed polylines and circles', () => {
    const result = parseDxf(DXF)
    expect(result.entities).toHaveLength(3)
    expect(result.entities[0]!.points).toEqual([
      [0, 0],
      [10, 0],
    ])
    expect(result.entities[1]!.closed).toBe(true)
    expect(result.entities[1]!.points).toHaveLength(4)
    expect(result.entities[1]!.layer).toBe('ROOM')
    expect(result.entities[2]!.closed).toBe(true)
    expect(result.entities[2]!.points.length).toBeGreaterThan(20)
  })

  it('parses SVG primitives and flips screen Y into plan Z', () => {
    const result = parseSvg(`
      <svg>
        <line x1="0" y1="0" x2="10" y2="0" />
        <polygon points="0,0 4,0 4,4 0,4" />
        <rect x="1" y="2" width="3" height="4" />
        <circle cx="5" cy="5" r="2" />
      </svg>
    `)
    expect(result.entities).toHaveLength(4)
    expect(result.entities[0]!.points).toEqual([
      [0, -0],
      [10, -0],
    ])
    expect(result.entities[2]!.closed).toBe(true)
    expect(result.entities[3]!.closed).toBe(true)
  })

  it('parses a simple JSON drawing', () => {
    const result = parseDrawingJson(
      JSON.stringify([{ points: [[0, 0], [2, 0], [2, 2]], closed: true, layer: 'path' }]),
    )
    expect(result.entities).toHaveLength(1)
    expect(result.entities[0]!.closed).toBe(true)
  })

  it('fits a drawing into a site and computes bounds', () => {
    const parsed = parseDxf(DXF)
    const transformed = transformDrawing(parsed.entities, {
      fit: { widthM: 20, depthM: 12, paddingM: 2 },
      offsetXM: 0,
      offsetZM: 0,
    })
    const bounds = drawingBounds(transformed)!
    expect(bounds.maxX - bounds.minX).toBeLessThanOrEqual(20)
    expect(bounds.maxZ - bounds.minZ).toBeLessThanOrEqual(12)
    expect(bounds.minX).toBeGreaterThanOrEqual(-10)
    expect(bounds.maxX).toBeLessThanOrEqual(10)
  })

  it('applies unit scale and rotation', () => {
    const source = [{ id: 'x', points: [[0, 0], [1000, 0]] as [number, number][], closed: false }]
    const scaled = transformDrawing(source, { unitScale: 0.001 })
    const bounds = drawingBounds(scaled)!
    expect(bounds.maxX - bounds.minX).toBeCloseTo(1, 3)
    const rotated = transformDrawing(source, { unitScale: 0.001, rotationDeg: 90 })
    const rotatedBounds = drawingBounds(rotated)!
    expect(rotatedBounds.maxZ - rotatedBounds.minZ).toBeCloseTo(1, 3)
  })
})
