import type { Garment } from '../types'
import garmentModels from '../data/garment-model-manifest.json'

export const avatarSource = {
  name: 'MakeHuman / CharacterCreator CC0 model exports',
  commit: '852e48f316b90a0937234886630e4fb4cdfd1f78',
  license: 'CC0-1.0',
  url: 'https://github.com/kblood/CharacterCreator/blob/852e48f316b90a0937234886630e4fb4cdfd1f78/LICENSE-NOTES.md',
}

export interface AvatarGarment { file: string; zone: number; kind: string; baked?: boolean; bodyCoverage?: string }
const models = new Map((garmentModels.assets as { family: string; file: string; bodyCoverage?: string }[]).map(model => [model.family, model]))
function fitted(kind: string, zone: number): AvatarGarment {
  const model = models.get(kind)
  return { file: model?.file || `garments/${kind}.glb`, kind, zone, baked: true, bodyCoverage: model?.bodyCoverage }
}
export function avatarGarment(garment: Garment, slot: string): AvatarGarment {
  const shortSleeves = garment.id === 'navy-shirt' || /short.sleeve/i.test(garment.name) || (garment.seasons.includes('Summer') && !garment.seasons.includes('Winter'))
  if (slot === 'bottoms') {
    if (garment.style === 'shorts') return fitted('shorts', 256)
    const cut = garment.id.includes('barrel') ? 'barrel' : garment.id === 'olive-wide' ? 'wide' : garment.id === 'grey-slacks' ? 'slim' : garment.id === 'black-ankle' ? 'ankle' : 'regular'
    return fitted(`trousers-${cut}`, 2)
  }
  if (slot === 'shoes') return { file: 'clothing_shoes.glb', zone: 1, kind: 'shoes' }
  if (slot === 'layers') {
    if (garment.style === 'coat') return fitted('coat', 16)
    if (garment.style === 'bomber') return fitted('bomber', 4096)
    if (garment.style === 'puffer') return fitted('puffer', 4096)
    if (garment.style === 'raincoat') return fitted('rain-jacket', 1024)
    return fitted(shortSleeves ? 'overshirt-short' : 'overshirt-long', shortSleeves ? 8 : 512)
  }
  if (garment.style === 'hoodie') return fitted('hoodie', 1024)
  if (garment.style === 'shirt' || garment.style === 'overshirt') {
    return fitted(shortSleeves ? 'shirt-short' : 'shirt-long', shortSleeves ? 8 : 512)
  }
  if (garment.style === 'sweatshirt') return fitted('sweatshirt', 512)
  if (garment.style === 'longsleeve') return fitted('longsleeve', 512)
  return fitted('tee', 8)
}
