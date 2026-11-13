import coreImage from '../assets/guides/aw-core.png'
import updatedImage from '../assets/guides/aw-updated.png'
import summerImage from '../assets/guides/ss.png'

// Bundled imports make missing files a build error and give production assets
// content-hashed URLs, instead of silently serving an SPA page for a bad path.
export const sourceGuides = {
  'aw-core': { title: 'Autumn / Winter · Core guide', image: coreImage, thumbnail: '/guide-previews/aw-core.webp', description: 'Core pieces and original autumn outfit combinations.' },
  'aw-updated': { title: 'Autumn / Winter · Updated wardrobe', image: updatedImage, thumbnail: '/guide-previews/aw-updated.webp', description: 'Updated actual collection and layered winter combinations.' },
  ss: { title: 'Spring / Summer · Style guide', image: summerImage, thumbnail: '/guide-previews/ss.webp', description: 'Summer pieces and original warm-weather combinations.' },
} as const
