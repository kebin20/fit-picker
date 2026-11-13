import type { Garment } from '../types'

export const avatarSource = {
  name: 'MakeHuman / CharacterCreator CC0 model exports',
  commit: '852e48f316b90a0937234886630e4fb4cdfd1f78',
  license: 'CC0-1.0',
  url: 'https://github.com/kblood/CharacterCreator/blob/852e48f316b90a0937234886630e4fb4cdfd1f78/LICENSE-NOTES.md',
}

export interface AvatarGarment { file: string; zone: number; kind: string }
export function avatarGarment(garment: Garment, slot: string): AvatarGarment {
  const shortSleeves = garment.id === 'navy-shirt' || /short.sleeve/i.test(garment.name) || (garment.seasons.includes('Summer') && !garment.seasons.includes('Winter'))
  if (slot === 'bottoms') return garment.style === 'shorts'
    ? { file: 'clothing_shorts.glb', zone: 256, kind: 'shorts' }
    : { file: 'clothing_jeans.glb', zone: 2, kind: 'trousers' }
  if (slot === 'shoes') return { file: 'clothing_shoes.glb', zone: 1, kind: 'shoes' }
  if (slot === 'layers') {
    if (garment.style === 'coat') return { file: 'clothing_trenchcoat.glb', zone: 16, kind: 'coat' }
    if (garment.style === 'shirt' || garment.style === 'overshirt') return { file: 'clothing_overshirt.glb', zone: shortSleeves ? 8 : 512, kind: shortSleeves ? 'overshirt-short' : 'overshirt' }
    return { file: 'clothing_jacket.glb', zone: 4096, kind: 'jacket' }
  }
  if (garment.style === 'hoodie') return { file: 'clothing_hoodie.glb', zone: 1024, kind: 'hoodie' }
  if (garment.style === 'shirt' || garment.style === 'overshirt') {
    return { file: 'clothing_shirt.glb', zone: shortSleeves ? 8 : 512, kind: shortSleeves ? 'shirt-short' : 'shirt' }
  }
  if (garment.style === 'sweatshirt' || garment.style === 'longsleeve') return { file: 'clothing_hoodie.glb', zone: 512, kind: 'sweater' }
  return { file: 'clothing_tshirt.glb', zone: 8, kind: 'tee' }
}
