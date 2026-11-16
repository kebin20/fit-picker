import type { Garment, Selection, Season, Occasion, Category } from '../types'
import { garmentPhoto } from './garment-photos'
export interface Wear { date: string; items: Selection }
export interface Personal { draft?: Selection; season?: Season; occasion?: Occasion; locks: Category[]; unavailable: string[]; history: Wear[]; pinned: string[]; hidden: string[]; edits: Garment[]; temperature: string; rain: boolean }
export const personalKey = 'fit-picker:personal:v1'
export const defaults: Personal = { locks: [], unavailable: [], history: [], pinned: [], hidden: [], edits: [], temperature: '', rain: false }
const cats = ['tops','layers','bottoms','shoes']; const seasons = ['Autumn','Winter','Spring','Summer']
const styles: Record<string, string[]> = { tops: ['tee','longsleeve','shirt','sweatshirt','hoodie','overshirt'], layers: ['overshirt','bomber','coat','puffer','raincoat'], bottoms: ['trousers','shorts'], shoes: ['sneakers','canvas','slipons'] }
export function validSelection(value: unknown): value is Selection { return !!value && typeof value === 'object' && !Array.isArray(value) && Object.entries(value).every(([k,v]) => cats.includes(k) && typeof v === 'string' && /^[a-z0-9-]{1,100}$/.test(v)) }
function validDay(value: string) { const date = new Date(`${value}T00:00:00Z`); return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value }
export function validatePersonal(value: unknown): Personal {
 if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid wardrobe data')
 const p = value as Personal
 for (const field of ['locks','unavailable','pinned','hidden'] as const) if (!Array.isArray(p[field]) || p[field].length > 5000 || !p[field].every(v => typeof v === 'string' && v.length < 100)) throw Error('Invalid preference list')
 if (p.locks.some(c => !cats.includes(c)) || !Array.isArray(p.edits) || p.edits.length > 100) throw Error('Invalid wardrobe')
 if (new Set(p.edits.map(g=>g?.id)).size !== p.edits.length) throw Error('Duplicate garments in backup')
 for (const g of p.edits) {
  if (!g || typeof g.id !== 'string' || !/^[a-z0-9-]{1,100}$/.test(g.id) || typeof g.name !== 'string' || !g.name.trim() || g.name.length > 100 || !cats.includes(g.category) || !styles[g.category]?.includes(g.style) || !/^#[0-9a-f]{6}$/i.test(g.color) || !Array.isArray(g.seasons) || !g.seasons.length || !g.seasons.every(s => seasons.includes(s)) || (g.note !== undefined && (typeof g.note !== 'string' || g.note.length > 1000))) throw Error('Invalid garment')
  if (typeof g.colorName !== 'string' || !g.colorName.trim() || g.colorName.length > 60 || !['aw-core','aw-updated','ss'].includes(g.source) || (g.waterproof !== undefined && typeof g.waterproof !== 'boolean') || (g.wearableAs !== undefined && (!Array.isArray(g.wearableAs) || !g.wearableAs.every(c=>cats.includes(c))))) throw Error('Invalid garment settings')
  if (g.photo !== undefined && (typeof g.photo !== 'string' || g.photo.length > 180000 || !/^data:image\/(webp|png|jpeg);base64,[a-zA-Z0-9+/=]+$/.test(g.photo))) throw Error('Invalid garment photo')
  if (g.warmth !== undefined && !['light','medium','warm'].includes(g.warmth)) throw Error('Invalid warmth')
  if (g.pattern !== undefined && !['check','graphic','stripes'].includes(g.pattern)) throw Error('Invalid garment pattern')
  if (g.chestPocket !== undefined && typeof g.chestPocket !== 'boolean') throw Error('Invalid pocket setting')
 }
 if (!Array.isArray(p.history) || p.history.length > 2000 || p.history.some(h => !h || !validSelection(h.items) || typeof h.date !== 'string' || !validDay(h.date))) throw Error('Invalid wear history')
 if (p.draft !== undefined && !validSelection(p.draft)) throw Error('Invalid draft')
 if (p.season !== undefined && !seasons.includes(p.season)) throw Error('Invalid season')
 if (p.occasion !== undefined && !['Everyday','Dinner','Date night','With friends','Outdoors'].includes(p.occasion)) throw Error('Invalid occasion')
 if (typeof p.temperature !== 'string' || (p.temperature !== '' && (!Number.isFinite(Number(p.temperature)) || Number(p.temperature) < -30 || Number(p.temperature) > 50)) || typeof p.rain !== 'boolean') throw Error('Invalid weather preferences')
 return { ...defaults, ...p, edits: p.edits.map(g => ({ ...g, ownership: 'confirmed' })) }
}
export function readPersonal(): Personal { try { return validatePersonal(JSON.parse(localStorage.getItem(personalKey) || 'null')) } catch { return { ...defaults } } }
export function weatherSuitable(items: Garment[], temperature: string, rain: boolean, layerId?: string) {
 const t = temperature === '' ? null : Number(temperature)
 const layer = items.find(g => layerId ? g.id === layerId : g.category === 'layers')
 const warm = items.some(g => g.warmth ? g.warmth === 'warm' : ['puffer','coat'].includes(g.style))
 if (t !== null && t >= 23 && (warm || items.some(g => ['hoodie','sweatshirt'].includes(g.style)))) return false
 if (t !== null && t < 10 && !warm) return false
 if (t !== null && t < 18 && items.some(g => g.style === 'shorts')) return false
 if (t !== null && t < 18 && !layer && !items.some(g => ['hoodie','sweatshirt','longsleeve'].includes(g.style) || g.warmth === 'medium' || g.warmth === 'warm')) return false
 if (rain && !(layer && (layer.style === 'raincoat' || layer.waterproof))) return false
 return true
}
export function localDay() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
export function offlineLook(items: Selection, garments: Garment[], modelPhoto?: string) {
 const urls = Object.values(items).map(id => garments.find(g => g.id === id)).filter((g): g is Garment => !!g && !g.photo && g.ownership === 'confirmed').map(g => garmentPhoto(g))
 if (modelPhoto) urls.push(modelPhoto)
 return navigator.serviceWorker?.register('/sw.js').then(async()=>{try{localStorage.setItem('fit-picker:offline','1')}catch{}const registration=await new Promise<ServiceWorkerRegistration>((resolve,reject)=>{const timer=window.setTimeout(()=>reject(Error('Offline storage could not be prepared.')),15000);navigator.serviceWorker.ready.then(r=>{clearTimeout(timer);resolve(r)},e=>{clearTimeout(timer);reject(e)})});registration.active?.postMessage({ type: 'CACHE_LOOK', urls })})
}
