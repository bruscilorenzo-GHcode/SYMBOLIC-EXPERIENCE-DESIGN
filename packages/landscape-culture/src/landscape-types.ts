export type LandscapeZoneKind = 'grove' | 'river' | 'clearing' | 'path' | 'threshold' | 'courtyard'

export interface LandscapeZone {
  id: string
  name: string
  kind: LandscapeZoneKind
  channelStart: number
  channelCount: number
  exposure: 'indoor' | 'sheltered' | 'outdoor'
  areaM2: number
}
