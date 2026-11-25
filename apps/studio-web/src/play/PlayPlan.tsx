import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { SiteContext } from '@aura-spec/design-bridge'
import {
  PLAY_OBJECT_CATALOG,
  type PlayComposition,
  type PlayObjectCatalogItem,
  type PlayObjectKind,
  type PlayObjectMode,
  type PlayObjectSpec,
} from '@aura-spec/play-engine'
import {
  SOUND_OBJECT_PERSONAS,
  habitatArchetypes,
  type PersonaKind,
} from '@aura-spec/inhabiting-model'
import { DESIGN_MATERIALS } from '../design/materials'

interface DragState {
  id: string
  pointerXM: number
  pointerZM: number
  startXM: number
  startZM: number
}

interface ResizeState {
  id: string
  pointerXM: number
  pointerZM: number
  startWidthM: number
  startDepthM: number
}

interface PlayPlanProps {
  composition: PlayComposition
  objects: PlayObjectSpec[]
  objectMode: PlayObjectMode
  site: SiteContext
  onMode: (mode: PlayObjectMode) => void
  onPlace: (kind: PlayObjectKind, xM: number, zM: number) => void
  onUpdate: (id: string, patch: Partial<Omit<PlayObjectSpec, 'id' | 'kind'>>) => void
  onRemove: (id: string) => void
  onPersona: (objectId: string, personaId: PersonaKind) => void
  habitatId: string
  onHabitat: (habitatId: string) => void
  lang?: 'it' | 'en'
}

export function PlayPlan({
  composition,
  objects,
  objectMode,
  site,
  onMode,
  onPlace,
  onUpdate,
  onRemove,
  onPersona,
  habitatId,
  onHabitat,
  lang = 'it',
}: PlayPlanProps) {
  const [activeKind, setActiveKind] = useState<PlayObjectKind | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [resize, setResize] = useState<ResizeState | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const catalogue = PLAY_OBJECT_CATALOG[objectMode]
  const selected = objects.find((object) => object.id === selectedId) ?? null

  const viewWidth = site.widthM + 3
  const viewDepth = site.depthM + 3
  const viewBox = `${-viewWidth / 2} ${-viewDepth / 2} ${viewWidth} ${viewDepth}`

  const labelFor = (object: PlayObjectSpec): string => {
    const item = catalogue.find((candidate) => candidate.kind === object.kind)
    return (lang === 'it' ? item?.italian : item?.english) ?? object.label
  }

  const clientToWorld = (event: ReactPointerEvent<SVGElement>): { xM: number; zM: number } => {
    const svg = svgRef.current
    if (!svg) return { xM: 0, zM: 0 }
    const point = svg.createSVGPoint()
    point.x = event.clientX
    point.y = event.clientY
    const matrix = svg.getScreenCTM()
    if (!matrix) return { xM: 0, zM: 0 }
    const local = point.matrixTransform(matrix.inverse())
    return { xM: Math.round(local.x * 20) / 20, zM: Math.round(local.y * 20) / 20 }
  }

  const onBackgroundPointerDown = (event: ReactPointerEvent<SVGSVGElement>): void => {
    const point = clientToWorld(event)
    if (activeKind) {
      onPlace(activeKind, point.xM, point.zM)
      return
    }
    setSelectedId(null)
  }

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>): void => {
    const point = clientToWorld(event)
    if (drag) {
      onUpdate(drag.id, {
        xM: Math.max(-site.widthM / 2, Math.min(site.widthM / 2, drag.startXM + point.xM - drag.pointerXM)),
        zM: Math.max(-site.depthM / 2, Math.min(site.depthM / 2, drag.startZM + point.zM - drag.pointerZM)),
      })
      return
    }
    if (resize) {
      const width = Math.max(0.4, Math.abs(point.xM) * 2)
      const depth = Math.max(0.4, Math.abs(point.zM) * 2)
      onUpdate(resize.id, { widthM: width, depthM: depth })
    }
  }

  return (
    <section className="play-plan" aria-label="Piano spaziale giocabile">
      <div className="plan-rail">
        <div className="rail-title">
          <span>{objectMode === 'landscape' ? (lang === 'it' ? 'GIARDINO' : 'GARDEN') : (lang === 'it' ? 'ARCHITETTURA' : 'ARCHITECTURE')}</span>
          <span>{objects.length} {lang === 'it' ? 'oggetti' : 'objects'}</span>
        </div>
        <label className="rail-habitat">
          <span>{lang === 'it' ? 'Habitat' : 'Habitat'}</span>
          <select value={habitatId} onChange={(event) => onHabitat(event.target.value)}>
            {(['indoor', 'outdoor'] as const).map((domain) => (
              <optgroup key={domain} label={domain === 'indoor' ? 'Interni' : 'Paesaggio'}>
                {habitatArchetypes(domain).map((archetype) => (
                  <option key={archetype.id} value={archetype.id}>
                    {lang === 'it' ? archetype.italian : archetype.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <div className="mode-switch" role="group" aria-label="Catalogo">
          <button type="button" className={objectMode === 'landscape' ? 'is-active' : ''} onClick={() => onMode('landscape')}>
            {lang === 'it' ? 'Paesaggio' : 'Landscape'}
          </button>
          <button type="button" className={objectMode === 'indoor' ? 'is-active' : ''} onClick={() => onMode('indoor')}>
            {lang === 'it' ? 'Interno' : 'Interior'}
          </button>
        </div>
        <div className="object-catalogue">
          {catalogue.map((item) => (
            <button
              key={item.kind}
              type="button"
              className={`object-chip${activeKind === item.kind ? ' is-active' : ''}`}
              aria-pressed={activeKind === item.kind}
              title={item.hint}
              onClick={() => setActiveKind(activeKind === item.kind ? null : item.kind)}
            >
              <span className="object-swatch" style={{ background: item.color }} />
              {lang === 'it' ? item.italian : item.english}
            </button>
          ))}
        </div>
        {activeKind ? (
          <p className="rail-hint">
            {lang === 'it' ? <>Scegli un punto del piano per piantare <strong>{catalogue.find((item) => item.kind === activeKind)?.italian}</strong>.</> : <>Choose a point on the plan to place <strong>{catalogue.find((item) => item.kind === activeKind)?.english}</strong>.</>}
          </p>
        ) : (
          <p className="rail-hint">{lang === 'it' ? 'Trascina un oggetto. Usa la maniglia per cambiarne il corpo.' : 'Drag an object. Use the handle to resize its body.'}</p>
        )}
      </div>

      <div className="plan-stage">
        <svg
          ref={svgRef}
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          onPointerDown={onBackgroundPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => { setDrag(null); setResize(null) }}
          onPointerLeave={() => { setDrag(null); setResize(null) }}
        >
          <defs>
            <radialGradient id="plan-glow" cx="50%" cy="45%" r="65%">
              <stop offset="0%" stopColor="#a9e2c5" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#071215" stopOpacity="0" />
            </radialGradient>
            <pattern id="play-grid" width="2" height="2" patternUnits="userSpaceOnUse">
              <path d="M 2 0 L 0 0 0 2" fill="none" stroke="rgba(198, 226, 206, 0.08)" strokeWidth="0.025" />
            </pattern>
          </defs>

          <rect x={-site.widthM / 2 - 2} y={-site.depthM / 2 - 2} width={site.widthM + 4} height={site.depthM + 4} fill="url(#plan-glow)" />
          <rect
            x={-site.widthM / 2}
            y={-site.depthM / 2}
            width={site.widthM}
            height={site.depthM}
            rx="0.4"
            fill="rgba(8, 23, 24, 0.86)"
            stroke="rgba(198, 226, 206, 0.3)"
            strokeWidth="0.06"
          />
          <rect
            x={-site.widthM / 2}
            y={-site.depthM / 2}
            width={site.widthM}
            height={site.depthM}
            rx="0.4"
            fill="url(#play-grid)"
          />

          {objects.map((object) => (
            <PlayObject
              key={object.id}
              object={object}
              label={labelFor(object)}
              selected={object.id === selectedId}
              onSelect={() => { setSelectedId(object.id); setActiveKind(null) }}
              onDragStart={(event) => {
                event.stopPropagation()
                const point = clientToWorld(event)
                setDrag({
                  id: object.id,
                  pointerXM: point.xM,
                  pointerZM: point.zM,
                  startXM: object.xM,
                  startZM: object.zM,
                })
                setSelectedId(object.id)
              }}
              onResizeStart={(event) => {
                event.stopPropagation()
                const point = clientToWorld(event)
                setResize({
                  id: object.id,
                  pointerXM: point.xM,
                  pointerZM: point.zM,
                  startWidthM: object.widthM,
                  startDepthM: object.depthM,
                })
                setSelectedId(object.id)
              }}
            />
          ))}
        </svg>

        {selected ? (
          <ObjectLens
            key={selected.id}
            object={selected}
            onUpdate={(patch) => onUpdate(selected.id, patch)}
            onRemove={() => { onRemove(selected.id); setSelectedId(null) }}
            onPersona={onPersona}
            lang={lang}
            label={labelFor(selected)}
          />
        ) : null}
      </div>
    </section>
  )
}

function PlayObject({
  object,
  label,
  selected,
  onSelect,
  onDragStart,
  onResizeStart,
}: {
  object: PlayObjectSpec
  label: string
  selected: boolean
  onSelect: () => void
  onDragStart: (event: ReactPointerEvent<SVGGElement>) => void
  onResizeStart: (event: ReactPointerEvent<SVGCircleElement>) => void
}) {
  const round =
    object.kind === 'tree-small' ||
    object.kind === 'tree-medium' ||
    object.kind === 'tree-large' ||
    object.kind === 'water' ||
    object.kind === 'stone' ||
    object.kind === 'column' ||
    object.kind === 'speaker'
  const radius = Math.max(object.widthM, object.depthM) / 2
  const opacity = object.kind === 'water' ? 0.58 : object.kind === 'canopy' ? 0.34 : 0.64

  return (
    <g
      onPointerDown={onDragStart}
      onClick={(event) => { event.stopPropagation(); onSelect() }}
      style={{ cursor: 'grab' }}
      transform={`rotate(${object.rotationDeg} ${object.xM} ${object.zM})`}
    >
      {round ? (
        <circle
          cx={object.xM}
          cy={object.zM}
          r={radius}
          fill={object.color}
          fillOpacity={opacity}
          stroke={selected ? '#ffd166' : object.color}
          strokeWidth={selected ? 0.09 : 0.04}
          vectorEffect="non-scaling-stroke"
        />
      ) : (
        <rect
          x={object.xM - object.widthM / 2}
          y={object.zM - object.depthM / 2}
          width={object.widthM}
          height={object.depthM}
          rx={object.kind === 'rug' || object.kind === 'ground-cover' ? Math.min(object.widthM, object.depthM) / 3 : 0.08}
          fill={object.color}
          fillOpacity={opacity}
          stroke={selected ? '#ffd166' : object.color}
          strokeWidth={selected ? 0.09 : 0.04}
          strokeDasharray={object.kind === 'canopy' || object.kind === 'room-volume' ? '0.28 0.18' : undefined}
          vectorEffect="non-scaling-stroke"
        />
      )}
      {selected ? (
        <>
          <text x={object.xM} y={object.zM - radius - 0.35} fill="#f8e8bd" fontSize="0.34" textAnchor="middle">
            {label}
          </text>
          <circle
            cx={object.xM + object.widthM / 2}
            cy={object.zM + object.depthM / 2}
            r={0.24}
            fill="#ffd166"
            pointerEvents="none"
          />
          <circle
            cx={object.xM + object.widthM / 2}
            cy={object.zM + object.depthM / 2}
            r={0.55}
            fill="transparent"
            stroke="transparent"
            pointerEvents="all"
            onPointerDown={onResizeStart}
            style={{ cursor: 'nwse-resize' }}
          />
        </>
      ) : null}
    </g>
  )
}

function ObjectLens({
  object,
  onUpdate,
  onRemove,
  onPersona,
  lang = 'it',
  label,
}: {
  object: PlayObjectSpec
  label: string
  onUpdate: (patch: Partial<Omit<PlayObjectSpec, 'id' | 'kind'>>) => void
  onRemove: () => void
  onPersona: (objectId: string, personaId: PersonaKind) => void
  lang?: 'it' | 'en'
}) {
  return (
    <aside className="object-lens" aria-label={`${lang === 'it' ? 'Oggetto' : 'Object'} ${object.label}`}>
      <header>
        <strong>{label}</strong>
        <span>{object.kind}</span>
      </header>
      {object.kind === 'speaker' ? (
        <div className="persona-picker" role="group" aria-label={lang === 'it' ? 'Persona della voce' : 'Voice persona'}>
          {SOUND_OBJECT_PERSONAS.map((persona) => (
            <button
              key={persona.id}
              type="button"
              className={`persona-chip${object.personaId === persona.id ? ' is-active' : ''}`}
              aria-pressed={object.personaId === persona.id}
              title={`${persona.italian} · ${persona.description}`}
              style={{ '--persona-color': persona.visual.color } as React.CSSProperties}
              onClick={() => onPersona(object.id, persona.id)}
            >
              {lang === 'it' ? persona.italian : persona.name}
            </button>
          ))}
        </div>
      ) : null}
      <label>
        <span>{lang === 'it' ? 'Larghezza' : 'Width'}</span>
        <input
          type="range"
          min={0.2}
          max={Math.max(8, object.widthM)}
          step={0.05}
          value={object.widthM}
          onChange={(event) => onUpdate({ widthM: Number(event.target.value) })}
        />
      </label>
      <label>
        <span>{lang === 'it' ? 'Profondità' : 'Depth'}</span>
        <input
          type="range"
          min={0.2}
          max={Math.max(8, object.depthM)}
          step={0.05}
          value={object.depthM}
          onChange={(event) => onUpdate({ depthM: Number(event.target.value) })}
        />
      </label>
      <label>
        <span>{lang === 'it' ? 'Altezza' : 'Height'}</span>
        <input
          type="range"
          min={0.05}
          max={12}
          step={0.05}
          value={object.heightM}
          onChange={(event) => onUpdate({ heightM: Number(event.target.value) })}
        />
      </label>
      <label>
        <span>{lang === 'it' ? 'Base' : 'Base'}</span>
        <input
          type="range"
          min={0}
          max={8}
          step={0.05}
          value={object.baseHeightM}
          onChange={(event) => onUpdate({ baseHeightM: Number(event.target.value) })}
        />
      </label>
      <label>
        <span>{lang === 'it' ? 'Rotazione' : 'Rotation'}</span>
        <input
          type="range"
          min={-180}
          max={180}
          step={1}
          value={object.rotationDeg}
          onChange={(event) => onUpdate({ rotationDeg: Number(event.target.value) })}
        />
      </label>
      <label>
        <span>{lang === 'it' ? 'Materia' : 'Material'}</span>
        <select value={object.materialId} onChange={(event) => onUpdate({ materialId: event.target.value })}>
          {DESIGN_MATERIALS.map((material) => (
            <option key={material.id} value={material.id}>{material.name}</option>
          ))}
        </select>
      </label>
      <button type="button" onClick={onRemove}>{lang === 'it' ? 'Sciogli l’oggetto' : 'Remove object'}</button>
    </aside>
  )
}
