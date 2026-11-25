import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { ArchitecturalItemSpec } from '@aura-spec/design-bridge'
import { useStudioStore } from '../state/store'

interface DragState {
  id: string
  pointerXM: number
  pointerZM: number
  startXM: number
  startZM: number
}

export function PlanEditor() {
  const site = useStudioStore((state) => state.site)
  const items = useStudioStore((state) => state.designItems)
  const zones = useStudioStore((state) => state.designZones)
  const imported = useStudioStore((state) => state.importedDrawing)
  const selectedId = useStudioStore((state) => state.selectedDesignItemId)
  const activeTool = useStudioStore((state) => state.activeDesignTool)
  const selectItem = useStudioStore((state) => state.selectDesignItem)
  const addItem = useStudioStore((state) => state.addDesignItem)
  const updateItem = useStudioStore((state) => state.updateDesignItem)
  const [zoom, setZoom] = useState(1)
  const [drag, setDrag] = useState<DragState | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const viewWidth = (site.widthM + 8) / zoom
  const viewDepth = (site.depthM + 8) / zoom
  const viewBox = `${-viewWidth / 2} ${-viewDepth / 2} ${viewWidth} ${viewDepth}`

  const clientToWorld = (event: ReactPointerEvent<SVGElement>): { xM: number; zM: number } => {
    const svg = svgRef.current
    if (!svg) return { xM: 0, zM: 0 }
    const point = svg.createSVGPoint()
    point.x = event.clientX
    point.y = event.clientY
    const matrix = svg.getScreenCTM()
    if (!matrix) return { xM: 0, zM: 0 }
    const local = point.matrixTransform(matrix.inverse())
    return { xM: local.x, zM: local.y }
  }

  const onBackgroundPointerDown = (event: ReactPointerEvent<SVGSVGElement>): void => {
    const point = clientToWorld(event)
    if (activeTool) {
      addItem(activeTool, round(point.xM), round(point.zM))
    } else {
      selectItem(null)
    }
  }

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>): void => {
    if (!drag) return
    const point = clientToWorld(event)
    updateItem(drag.id, {
      xM: round(drag.startXM + point.xM - drag.pointerXM),
      zM: round(drag.startZM + point.zM - drag.pointerZM),
    })
  }

  return (
    <div className="plan-shell">
      <div className="plan-toolbar">
        <span className="plan-hint">
          {activeTool ? `Click the plan to place a ${activeTool}` : drag ? 'Dragging item…' : 'Select an item, or choose a tool at left'}
        </span>
        <div className="zoom-controls">
          <button type="button" onClick={() => setZoom((value) => Math.max(1, value - 1))}>−</button>
          <span>{zoom.toFixed(1)}×</span>
          <button type="button" onClick={() => setZoom((value) => Math.min(4, value + 1))}>+</button>
          <button type="button" onClick={() => setZoom(1)}>Fit</button>
        </div>
      </div>
      <div className="plan-canvas">
        <svg
          ref={svgRef}
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          onPointerDown={onBackgroundPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => setDrag(null)}
          onPointerLeave={() => setDrag(null)}
        >
          <defs>
            <pattern id="plan-grid-1" width="1" height="1" patternUnits="userSpaceOnUse">
              <path d="M 1 0 L 0 0 0 1" fill="none" stroke="#1b2830" strokeWidth="0.02" />
            </pattern>
            <pattern id="plan-grid-5" width="5" height="5" patternUnits="userSpaceOnUse">
              <rect width="5" height="5" fill="url(#plan-grid-1)" />
              <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#28404c" strokeWidth="0.05" />
            </pattern>
          </defs>

          <rect
            x={-site.widthM / 2}
            y={-site.depthM / 2}
            width={site.widthM}
            height={site.depthM}
            fill="#0b1217"
            stroke="#304652"
            strokeWidth="0.08"
          />
          <rect
            x={-site.widthM / 2}
            y={-site.depthM / 2}
            width={site.widthM}
            height={site.depthM}
            fill="url(#plan-grid-5)"
            opacity={0.8}
          />

          {imported?.format === 'image' && imported.imageUrl ? (
            <image
              href={imported.imageUrl}
              x={imported.offsetXM - ((imported.widthPx ?? 0) * (imported.metresPerPixel ?? 0.01)) / 2}
              y={imported.offsetZM - ((imported.heightPx ?? 0) * (imported.metresPerPixel ?? 0.01)) / 2}
              width={(imported.widthPx ?? 0) * (imported.metresPerPixel ?? 0.01)}
              height={(imported.heightPx ?? 0) * (imported.metresPerPixel ?? 0.01)}
              opacity={0.32}
              preserveAspectRatio="none"
              transform={`rotate(${imported.rotationDeg} ${imported.offsetXM} ${imported.offsetZM})`}
            />
          ) : null}

          {imported?.entities.map((entity) => (
            <polyline
              key={entity.id}
              points={entity.points.map(([x, z]) => `${x},${z}`).join(' ')}
              fill={entity.closed ? 'rgba(127, 179, 255, 0.04)' : 'none'}
              stroke="#6f94a6"
              strokeWidth="0.045"
              vectorEffect="non-scaling-stroke"
              opacity={0.75}
              strokeDasharray={entity.closed ? undefined : '0.15 0.1'}
            />
          ))}

          {zones.map((zone) => (
            <g key={zone.id}>
              <rect
                x={zone.xM - zone.widthM / 2}
                y={zone.zM - zone.depthM / 2}
                width={zone.widthM}
                height={zone.depthM}
                fill="rgba(127, 179, 255, 0.035)"
                stroke="#4f7892"
                strokeWidth="0.04"
                strokeDasharray="0.25 0.18"
                vectorEffect="non-scaling-stroke"
              />
              <text x={zone.xM} y={zone.zM - zone.depthM / 2 - 0.2} fill="#62859a" fontSize="0.32" textAnchor="middle">
                {zone.name}
              </text>
            </g>
          ))}

          {items.map((item) => (
            <PlanItem
              key={item.id}
              item={item}
              selected={item.id === selectedId}
              onSelect={() => selectItem(item.id)}
              onDragStart={(event) => {
                event.stopPropagation()
                const point = clientToWorld(event)
                setDrag({
                  id: item.id,
                  pointerXM: point.xM,
                  pointerZM: point.zM,
                  startXM: item.xM,
                  startZM: item.zM,
                })
                selectItem(item.id)
              }}
            />
          ))}

          {activeTool ? (
            <rect
              x={-site.widthM / 2}
              y={-site.depthM / 2}
              width={site.widthM}
              height={site.depthM}
              fill="transparent"
              style={{ cursor: 'crosshair' }}
              onPointerDown={(event) => {
                event.stopPropagation()
                const point = clientToWorld(event)
                addItem(activeTool, round(point.xM), round(point.zM))
              }}
            />
          ) : null}

          <g transform={`translate(${-site.widthM / 2 + 0.6} ${-site.depthM / 2 + 0.8})`}>
            <line x1="0" y1="0" x2="0" y2="-0.9" stroke="#8ad7c1" strokeWidth="0.05" />
            <text x="0" y="-1.05" fill="#8ad7c1" fontSize="0.32" textAnchor="middle">N</text>
          </g>
        </svg>
      </div>
    </div>
  )
}

function PlanItem({
  item,
  selected,
  onSelect,
  onDragStart,
}: {
  item: ArchitecturalItemSpec
  selected: boolean
  onSelect: () => void
  onDragStart: (event: ReactPointerEvent<SVGGElement>) => void
}) {
  const opacity =
    item.kind === 'floor'
      ? 0.2
      : item.kind === 'glass' || item.kind === 'opening'
        ? 0.38
        : item.kind === 'water'
          ? 0.55
          : item.kind === 'canopy'
            ? 0.32
            : 0.62
  const common = {
    fill: item.color,
    fillOpacity: opacity,
    stroke: selected ? '#ffd166' : item.color,
    strokeWidth: selected ? 0.1 : 0.045,
    vectorEffect: 'non-scaling-stroke' as const,
    style: { cursor: 'grab' as const },
  }
  if (item.kind === 'column') {
    return (
      <g onPointerDown={onDragStart} onClick={(event) => { event.stopPropagation(); onSelect() }}>
        <circle cx={item.xM} cy={item.zM} r={Math.max(item.widthM, item.depthM) / 2} {...common} />
        {selected ? <text x={item.xM} y={item.zM - 0.5} fill="#ffd166" fontSize="0.3" textAnchor="middle">{item.label}</text> : null}
      </g>
    )
  }
  return (
    <g onPointerDown={onDragStart} onClick={(event) => { event.stopPropagation(); onSelect() }}>
      <rect
        x={item.xM - item.widthM / 2}
        y={item.zM - item.depthM / 2}
        width={item.widthM}
        height={item.depthM}
        transform={`rotate(${item.rotationDeg} ${item.xM} ${item.zM})`}
        {...common}
        strokeDasharray={item.kind === 'canopy' ? '0.25 0.16' : undefined}
      />
      {selected ? (
        <text x={item.xM} y={item.zM - item.depthM / 2 - 0.25} fill="#ffd166" fontSize="0.3" textAnchor="middle">
          {item.label}
        </text>
      ) : null}
    </g>
  )
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
