import { useState } from 'react'
import type { Garment } from '../types'
import { hasBackPhoto } from '../lib/garment-photos'
import GarmentArt from './GarmentArt'

export default function WardrobePhoto({ garment }: { garment: Garment }) {
  const [side, setSide] = useState<'front' | 'back'>('front')
  return <>
    <div className="wardrobe-art"><GarmentArt garment={garment} side={side}/></div>
    {hasBackPhoto(garment) && <div className="garment-photo-controls" role="group" aria-label={`Photo view for ${garment.name}`}>
      {(['front', 'back'] as const).map(view => <button key={view} aria-pressed={side === view} onClick={() => setSide(view)}>{view === 'front' ? 'Front' : 'Back'}</button>)}
    </div>}
  </>
}
