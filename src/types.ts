export type Category = 'tops' | 'layers' | 'bottoms' | 'shoes'
export type Season = 'Autumn' | 'Winter' | 'Spring' | 'Summer'
export type Occasion = 'Everyday' | 'Dinner' | 'Date night' | 'With friends' | 'Outdoors'
export type GarmentStyle = 'tee' | 'longsleeve' | 'shirt' | 'sweatshirt' | 'hoodie' | 'overshirt' | 'bomber' | 'coat' | 'puffer' | 'raincoat' | 'trousers' | 'shorts' | 'sneakers' | 'canvas' | 'slipons'
export interface Garment {
  photo?: string
  warmth?: 'light' | 'medium' | 'warm'
  waterproof?: boolean
  chestPocket?: boolean
  id: string
  name: string
  category: Category
  wearableAs?: Category[]
  color: string
  colorName: string
  style: GarmentStyle
  seasons: Season[]
  source: 'aw-core' | 'aw-updated' | 'ss'
  note?: string
  pattern?: 'check' | 'graphic' | 'stripes'
  ownership?: 'confirmed' | 'recommended' | 'not-owned'
}
export interface Outfit {
  origin?: 'guide' | 'styled'
  image?: string
  id: string
  name: string
  subtitle: string
  items: { tops: string; layers?: string; bottoms: string; shoes: string }
  seasons: Season[]
  occasions: Occasion[]
  source: 'aw-core' | 'aw-updated' | 'ss'
  sourceLabel: string
  sourceIndex: number
  vibe: string
  note?: string
}
export type Selection = Partial<Record<Category, string>>
