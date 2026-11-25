import type { DrawingEntity } from '@aura-spec/design-bridge'

export type DrawingFormat = 'dxf' | 'svg' | 'json' | 'image'

export interface ImportedDrawing {
  id: string
  fileName: string
  format: DrawingFormat
  entities: DrawingEntity[]
  warnings: string[]
  importedAt: string
  /** Raster underlay, when the source is an image. */
  imageUrl?: string
  widthPx?: number
  heightPx?: number
  metresPerPixel?: number
  offsetXM: number
  offsetZM: number
  rotationDeg: number
}
