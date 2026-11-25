import { useEffect, useRef, useState } from 'react'
import {
  parseDrawingJson,
  parseDxf,
  parseSvg,
  transformDrawing,
  type DrawingEntity,
} from '@aura-spec/design-bridge'
import { useStudioStore } from '../state/store'
import type { ImportedDrawing } from './import/types'

type Unit = 'mm' | 'cm' | 'm'

export function ImportPanel() {
  const site = useStudioStore((state) => state.site)
  const imported = useStudioStore((state) => state.importedDrawing)
  const setImported = useStudioStore((state) => state.setImportedDrawing)
  const [unit, setUnit] = useState<Unit>('mm')
  const [fit, setFit] = useState(true)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('DXF, SVG, JSON or a raster underlay.')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(
    () => () => {
      if (imported?.imageUrl) URL.revokeObjectURL(imported.imageUrl)
    },
    [imported?.imageUrl],
  )

  const importFile = async (file: File): Promise<void> => {
    setBusy(true)
    setStatus(`Reading ${file.name}…`)
    try {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
      if (file.type.startsWith('image/')) {
        const imageUrl = URL.createObjectURL(file)
        const dimensions = await imageDimensions(imageUrl)
        setImported({
          id: `drawing-${Date.now()}`,
          fileName: file.name,
          format: 'image',
          entities: [],
          warnings: ['Raster underlay: calibrate metres per pixel, then trace or place architectural items over it.'],
          importedAt: new Date().toISOString(),
          imageUrl,
          widthPx: dimensions.width,
          heightPx: dimensions.height,
          metresPerPixel: Math.max(0.002, Math.min(0.2, site.widthM / Math.max(1, dimensions.width) * 0.8)),
          offsetXM: 0,
          offsetZM: 0,
          rotationDeg: 0,
        })
        setStatus(`Image underlay ${dimensions.width} × ${dimensions.height}px imported.`)
      } else {
        const text = await file.text()
        const parsed =
          extension === 'dxf'
            ? parseDxf(text)
            : extension === 'svg'
              ? parseSvg(text)
              : extension === 'json'
                ? parseDrawingJson(text)
                : (() => {
                    throw new Error('Unsupported format. Use .dxf, .svg, .json, PNG or JPG.')
                  })()
        const unitScale = unit === 'mm' ? 0.001 : unit === 'cm' ? 0.01 : 1
        const transformed = transformDrawing(parsed.entities as DrawingEntity[], {
          unitScale,
          fit: fit ? { widthM: site.widthM, depthM: site.depthM, paddingM: 1 } : undefined,
          offsetXM: 0,
          offsetZM: 0,
          rotationDeg: 0,
        })
        if (transformed.length === 0) throw new Error('The drawing contains no supported geometry.')
        const drawing: ImportedDrawing = {
          id: `drawing-${Date.now()}`,
          fileName: file.name,
          format: extension as ImportedDrawing['format'],
          entities: transformed,
          warnings: parsed.warnings,
          importedAt: new Date().toISOString(),
          offsetXM: 0,
          offsetZM: 0,
          rotationDeg: 0,
        }
        setImported(drawing)
        setStatus(
          `${transformed.length} entities imported${fit ? ' and fitted to the site' : ` at ${unit} scale`}.`,
        )
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const updateImage = (patch: Partial<ImportedDrawing>): void => {
    if (!imported) return
    setImported({ ...imported, ...patch })
  }

  return (
    <section>
      <h2>Technical drawing</h2>
      <div className="import-controls">
        <label className="design-field">
          <span>Unit</span>
          <select value={unit} onChange={(event) => setUnit(event.target.value as Unit)}>
            <option value="mm">Millimetres</option>
            <option value="cm">Centimetres</option>
            <option value="m">Metres</option>
          </select>
        </label>
        <label className="toggle-row compact">
          <input type="checkbox" checked={fit} onChange={(event) => setFit(event.target.checked)} />
          <span>Fit to site</span>
        </label>
      </div>
      <input
        ref={inputRef}
        className="file-input"
        type="file"
        accept=".dxf,.svg,.json,image/png,image/jpeg,image/webp"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void importFile(file)
        }}
      />
      <button type="button" className="wide-button" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? 'Importing…' : 'Import drawing'}
      </button>
      <p className="import-status">{status}</p>
      {imported ? (
        <div className="imported-card">
          <div>
            <strong>{imported.fileName}</strong>
            <small>
              {imported.entities.length > 0
                ? `${imported.entities.length} entities`
                : `${imported.widthPx ?? 0} × ${imported.heightPx ?? 0} px`}
            </small>
          </div>
          {imported.format === 'image' ? (
            <div className="site-grid">
              <label className="design-field span-2">
                <span>Metres / pixel</span>
                <input
                  type="number"
                  step={0.001}
                  min={0.001}
                  value={imported.metresPerPixel ?? 0.01}
                  onChange={(event) => updateImage({ metresPerPixel: Number(event.target.value) })}
                />
              </label>
              <label className="design-field">
                <span>Offset X</span>
                <input
                  type="number"
                  step={0.1}
                  value={imported.offsetXM}
                  onChange={(event) => updateImage({ offsetXM: Number(event.target.value) })}
                />
              </label>
              <label className="design-field">
                <span>Offset Z</span>
                <input
                  type="number"
                  step={0.1}
                  value={imported.offsetZM}
                  onChange={(event) => updateImage({ offsetZM: Number(event.target.value) })}
                />
              </label>
            </div>
          ) : null}
          {imported.warnings.length > 0 ? (
            <p className="import-warning">{imported.warnings.slice(0, 2).join(' ')}</p>
          ) : null}
          <button type="button" className="text-button" onClick={() => setImported(null)}>
            Remove drawing
          </button>
        </div>
      ) : null}
      <p className="muted small">
        DWG/PDF are not parsed in-browser yet; export to DXF/SVG or use a raster underlay. All imports stay local.
      </p>
    </section>
  )
}

function imageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => reject(new Error('Unable to read the image dimensions'))
    image.src = url
  })
}
