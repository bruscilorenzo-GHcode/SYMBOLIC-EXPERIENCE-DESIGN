import { useMemo, type KeyboardEvent } from 'react'
import {
  SPATIAL_FIELDS,
  spatialFieldDescription,
  spatialFieldLabel,
  type SpatialFieldProfile,
} from '@aura-spec/play-engine'

export type SpatialProfile = SpatialFieldProfile

export function SpatialGlyph({
  habitatName,
  dimensions,
  channels,
  profile,
  density,
  movement,
  playing,
  lang,
  onCycleField,
  onSelectField,
}: {
  habitatName: string
  dimensions: string
  channels: number
  profile: SpatialProfile
  density: number
  movement: number
  playing: boolean
  lang: 'it' | 'en'
  onCycleField: (direction?: 1 | -1) => void
  onSelectField: (field: SpatialFieldProfile) => void
}) {
  const field =
    profile === 'omni'
      ? { rx: 108, ry: 76 }
      : profile === 'line'
        ? { rx: 132, ry: 48 }
        : { rx: 72, ry: 108 }
  const count = Math.max(2, Math.round(channels))
  const fieldLabel = spatialFieldLabel(profile, lang)
  const fieldDescription = spatialFieldDescription(profile, lang)
  const points = useMemo(() => {
    const spread = 0.94 + density * 0.1
    if (profile === 'line') {
      const spacing = count > 1 ? Math.min(58, 244 / (count - 1)) : 0
      return Array.from({ length: count }, (_, index) => ({
        x: 180 + (index - (count - 1) / 2) * spacing,
        y: 108 + (index % 2 === 0 ? -1 : 1) * density * 4,
      }))
    }
    if (profile === 'lens') {
      // Keep nodes in the narrow cone and clear of the LISTENING label.
      const reach = 46
      return Array.from({ length: count }, (_, index) => {
        const offset = count > 1 ? (index / (count - 1) - 0.5) * 2 * reach : 0
        const x = 256 + (1 - Math.abs(offset) / reach) * 6
        return { x, y: 130 + offset }
      })
    }
    return Array.from({ length: count }, (_, index) => {
      const angle = (Math.PI * 2 * index) / count - Math.PI / 2
      const rx = count === 2 ? 102 : 126
      const ry = count === 2 ? 62 : 82
      return {
        x: 180 + Math.cos(angle) * rx * spread,
        y: 130 + Math.sin(angle) * ry * spread,
      }
    })
  }, [count, density, profile])

  const cycleFromKey = (event: KeyboardEvent<SVGElement>): void => {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      onCycleField(1)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      onCycleField(-1)
    }
  }

  return (
    <div
      className={`site-spatial-glyph-frame site-spatial-glyph-frame--${profile}${playing ? ' is-playing' : ''}`}
      data-field={profile}
    >
      <div
        className="site-field-switcher"
        role="group"
        aria-label={lang === 'it' ? 'Campo di diffusione nella partitura spaziale' : 'Diffusion field in the spatial score'}
      >
        {SPATIAL_FIELDS.map((option) => {
          const active = option.id === profile
          return (
            <button
              key={option.id}
              type="button"
              className={`site-field-switcher__option${active ? ' is-active' : ''}`}
              aria-pressed={active}
              aria-label={`${spatialFieldLabel(option.id, lang)} — ${spatialFieldDescription(option.id, lang)}`}
              onClick={() => onSelectField(option.id)}
              data-target-field={option.id}
            >
              <span className="site-field-switcher__mark" aria-hidden="true">{active ? '✓' : '○'}</span>
              {spatialFieldLabel(option.id, lang)}
            </button>
          )
        })}
        <span className="site-field-switcher__hint">
          {lang === 'it' ? 'tocca il campo o i nodi per cambiare' : 'tap the field or nodes to change'}
        </span>
      </div>

      <svg
        className={`site-spatial-glyph${playing ? ' is-playing' : ''}`}
        viewBox="0 0 360 260"
        role="group"
        aria-label={`${lang === 'it' ? 'Campo spaziale interattivo per' : 'Interactive spatial field for'} ${habitatName}, ${count} ${lang === 'it' ? 'canali' : 'channels'}, ${fieldLabel}`}
      >
        <defs>
          <pattern id="site-score-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0H0V20" fill="none" stroke="currentColor" strokeOpacity=".13" strokeWidth=".7" />
          </pattern>
        </defs>
        <rect x="20" y="20" width="320" height="220" fill="url(#site-score-grid)" stroke="currentColor" strokeOpacity=".4" />
        <path
          className="site-spatial-glyph__route"
          d="M38 205C105 175 93 88 162 83s89 82 158 38"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeDasharray="4 6"
          opacity=".5"
          style={{ animationDuration: `${6 - movement * 3}s` }}
        />
        <g
          className="site-spatial-glyph__field-hit"
          role="button"
          tabIndex={0}
          aria-label={`${lang === 'it' ? 'Campo attivo' : 'Active field'}: ${fieldLabel}. ${lang === 'it' ? 'Premi Invio o tocca per cambiare campo' : 'Press Enter or tap to change field'}.`}
          onClick={() => onCycleField(1)}
          onKeyDown={cycleFromKey}
        >
          <ellipse cx="180" cy="130" rx={field.rx + 8} ry={field.ry + 8} fill="transparent" />
          <ellipse
            className="site-spatial-glyph__field"
            cx="180"
            cy="130"
            rx={field.rx}
            ry={field.ry}
            fill="none"
            stroke="var(--site-brick)"
            strokeWidth="1.2"
            opacity=".72"
          />
          <ellipse
            className="site-spatial-glyph__field site-spatial-glyph__field--delay"
            cx="180"
            cy="130"
            rx={field.rx * 0.66}
            ry={field.ry * 0.66}
            fill="none"
            stroke="var(--site-brick)"
            strokeWidth="1"
            opacity=".58"
          />
        </g>
        {profile === 'line' ? (
          <g className="site-spatial-glyph__beam" opacity=".7" aria-hidden="true">
            <path d="M54 130H306" fill="none" stroke="currentColor" strokeWidth=".8" />
            <path d="M54 116H306" fill="none" stroke="currentColor" strokeWidth=".6" opacity=".7" />
            <path d="M54 144H306" fill="none" stroke="currentColor" strokeWidth=".6" opacity=".7" />
          </g>
        ) : null}
        {profile === 'lens' ? (
          <path
            className="site-spatial-glyph__cone"
            d="M180 130 L244 62 L272 130 L244 198 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth=".8"
            opacity=".55"
            aria-hidden="true"
          />
        ) : null}
        <text x={profile === 'lens' ? 44 : 194} y="126" className="site-spatial-glyph__label" aria-hidden="true">LISTENING</text>
        <text x={profile === 'lens' ? 44 : 194} y="139" className="site-spatial-glyph__micro" aria-hidden="true">{density.toFixed(2)} density</text>
        {points.map((point, index) => (
          <g
            key={index}
            transform={`translate(${point.x} ${point.y})`}
            className="site-spatial-glyph__node"
            role="button"
            tabIndex={0}
            aria-label={`${lang === 'it' ? 'Altoparlante' : 'Speaker'} S${String(index + 1).padStart(2, '0')} — ${fieldLabel}. ${lang === 'it' ? 'Premi Invio o tocca per cambiare campo' : 'Press Enter or tap to change field'}.`}
            onClick={(event) => {
              event.stopPropagation()
              onCycleField(1)
            }}
            onKeyDown={cycleFromKey}
          >
            <circle className="site-spatial-glyph__node-ring" r="7" fill="none" stroke="currentColor" strokeWidth="1.1" />
            <circle r="2" fill="currentColor" />
            <text x="10" y="-9" className="site-spatial-glyph__micro" aria-hidden="true">S{String(index + 1).padStart(2, '0')}</text>
          </g>
        ))}
        <text x="28" y="234" className="site-spatial-glyph__micro" aria-hidden="true">{dimensions}</text>
        <text x="332" y="234" textAnchor="end" className="site-spatial-glyph__micro" aria-hidden="true">
          {count} CH / {fieldLabel.toUpperCase()}
        </text>
      </svg>

      <p className="site-field-status" role="status" aria-live="polite">
        <span aria-hidden="true">✓</span>{' '}
        <strong>{lang === 'it' ? 'Campo attivo' : 'Active field'}: {fieldLabel}.</strong>{' '}
        {fieldDescription}
      </p>
    </div>
  )
}
