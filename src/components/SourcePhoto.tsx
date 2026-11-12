import type { Outfit } from '../types'

export const sourceInfo = {
  'aw-core': { title: 'Autumn / Winter · Core guide', image: '/references/aw-core.png', width: 1220, height: 1289 },
  'aw-updated': { title: 'Autumn / Winter · Updated wardrobe', image: '/references/aw-updated.png', width: 1536, height: 1024 },
  ss: { title: 'Spring / Summer · Style guide', image: '/references/ss.png', width: 1312, height: 1199 },
}

export default function SourcePhoto({ outfit }: { outfit: Outfit }) {
  const source = sourceInfo[outfit.source]
  const index = outfit.sourceIndex
  const rect = outfit.source === 'aw-core'
    ? [7 + index * 152, 479, 144, 348]
    : outfit.source === 'aw-updated'
      ? [545 + index % 8 * 100, index < 8 ? 78 : 417, 94, index < 8 ? 216 : 202]
      : [17 + index % 15 * 85.5, index < 15 ? 193 : 608, 80, 282]
  const clipId = `source-crop-${outfit.id}`
  return <svg className="source-photo" viewBox={rect.join(' ')} role="img" aria-label={`${outfit.name} in your original guide`} preserveAspectRatio="xMidYMid meet"><defs><clipPath id={clipId}><rect x={rect[0]} y={rect[1]} width={rect[2]} height={rect[3]}/></clipPath></defs><image href={source.image} width={source.width} height={source.height} clipPath={`url(#${clipId})`}/></svg>
}
