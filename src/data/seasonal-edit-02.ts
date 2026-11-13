import type { Occasion, Outfit, Season } from '../types'
import { garments } from './wardrobe'

interface Template { title: string; top: string; layer?: string; bottoms: string[]; smart?: boolean; outdoors?: boolean; reason: string }
const templates: Record<Season, Template[]> = {
  Autumn: [
    { title: 'Navy, softly layered', top: 'navy-shirt', layer: 'brown-overshirt', bottoms: ['beige-trousers', 'black-barrel', 'white-barrel', 'olive-wide'], smart: true, outdoors: true, reason: 'A collared navy shirt and earthy brown layer make a neat autumn combination without feeling formal.' },
    { title: 'Rust in the city', top: 'rust-tee', layer: 'navy-bomber', bottoms: ['brown-barrel', 'grey-slacks', 'white-barrel', 'beige-trousers'], outdoors: true, reason: 'The navy bomber balances the warm rust tee; a neutral trouser colour keeps the palette considered.' },
    { title: 'Cream under camel', top: 'offwhite-sweatshirt', layer: 'beige-coat', bottoms: ['olive-wide', 'brown-barrel', 'black-barrel', 'cream-pants'], smart: true, outdoors: true, reason: 'An off-white sweatshirt and beige coat give cooler autumn days a soft, clean layered look.' },
    { title: 'The personal layer', top: 'ainu-longsleeve', layer: 'brown-overshirt', bottoms: ['black-barrel', 'cream-pants', 'grey-slacks', 'white-barrel'], outdoors: true, reason: 'Your Ainu tee stays the personal detail, with a plain brown overshirt giving the graphic a quiet backdrop.' },
    { title: 'Solid brown, easy plans', top: 'brown-flannel', bottoms: ['olive-wide', 'beige-trousers', 'white-barrel', 'black-barrel'], smart: true, reason: 'The solid brown flannel supplies texture without a pattern. A relaxed trouser cut keeps this ready for a casual dinner or meet-up.' },
    { title: 'The olive afternoon', top: 'white-hoodie', layer: 'green-bomber', bottoms: ['brown-barrel', 'cream-pants', 'white-barrel', 'olive-wide'], outdoors: true, reason: 'A white hoodie lightens the olive bomber, creating a comfortable combination for a mild autumn afternoon.' },
  ],
  Winter: [
    { title: 'Warm contrast', top: 'offwhite-sweatshirt', layer: 'black-puffer', bottoms: ['brown-barrel', 'olive-wide', 'grey-slacks', 'black-barrel'], outdoors: true, reason: 'Your warm puffer covers an off-white sweatshirt, with full-length trousers for a practical winter day out.' },
    { title: 'Navy, winter-ready', top: 'navy-sweatshirt', layer: 'beige-coat', bottoms: ['brown-barrel', 'olive-wide', 'grey-slacks', 'cream-pants'], smart: true, outdoors: true, reason: 'A beige coat gives the navy sweatshirt a cleaner outline for a relaxed winter dinner or date.' },
    { title: 'The brown hood', top: 'brown-hoodie', layer: 'black-puffer', bottoms: ['grey-slacks', 'cream-pants', 'brown-barrel', 'black-barrel'], outdoors: true, reason: 'Light brown softens the black puffer while the hoodie and full-length pants make this an easy winter layering formula.' },
    { title: 'A clean winter layer', top: 'white-hoodie', layer: 'beige-coat', bottoms: ['grey-slacks', 'brown-barrel', 'black-barrel', 'olive-wide'], smart: true, outdoors: true, reason: 'The white hood sits outside the beige coat collar for a clean, relaxed silhouette. A good option for a casual evening.' },
    { title: 'Ainu in winter', top: 'ainu-longsleeve', layer: 'black-puffer', bottoms: ['cream-pants', 'brown-barrel', 'olive-wide', 'black-barrel'], outdoors: true, reason: 'The black puffer provides the warm outer layer while the Ainu long-sleeve tee keeps the outfit personal.' },
    { title: 'Brown beneath beige', top: 'brown-flannel', layer: 'beige-coat', bottoms: ['black-barrel', 'white-barrel', 'grey-slacks', 'brown-barrel'], smart: true, outdoors: true, reason: 'A solid brown flannel under your beige coat combines soft texture and warm neutrals for winter outings and casual dinners.' },
  ],
  Spring: [
    { title: 'Teal over cream', top: 'cream-tee', layer: 'teal-shirt', bottoms: ['beige-trousers', 'brown-barrel', 'white-barrel', 'olive-wide'], outdoors: true, reason: 'Wear the teal shirt open over the cream tee. The light inner layer makes this a fresh option for a warm spring afternoon.' },
    { title: 'The white-shirt edit', top: 'white-shirt', bottoms: ['grey-slacks', 'olive-wide', 'cream-pants', 'brown-barrel'], smart: true, outdoors: true, reason: 'A white collared shirt and neutral trousers give a warm spring day a clean finish, ready for lunch or a casual evening.' },
    { title: 'Navy, on navy', top: 'navy-tee', layer: 'navy-bomber', bottoms: ['cream-pants', 'grey-slacks', 'beige-trousers', 'black-ankle'], outdoors: true, reason: 'A tonal navy top and bomber keep the upper half calm. The trousers provide contrast for cooler spring days.' },
    { title: 'The soft spring crew', top: 'offwhite-sweatshirt', bottoms: ['beige-trousers', 'grey-slacks', 'white-barrel', 'olive-wide'], outdoors: true, reason: 'An off-white crewneck and relaxed trousers are comfortable for a mild spring day with simple, clean proportions.' },
    { title: 'Rust, lightly layered', top: 'rust-tee', layer: 'brown-overshirt', bottoms: ['white-barrel', 'grey-slacks', 'black-ankle', 'olive-wide'], outdoors: true, reason: 'The rust tee and plain brown overshirt keep their earthy feel, with lighter styling for a mild spring day.' },
    { title: 'The brown spring shirt', top: 'brown-shirt', bottoms: ['white-barrel', 'grey-slacks', 'olive-wide', 'cream-pants'], smart: true, outdoors: true, reason: 'A short-sleeve brown shirt provides a neat alternative to a tee on warm spring days. Keep the collar open and the silhouette relaxed.' },
  ],
  Summer: [
    { title: 'Navy in the sunshine', top: 'navy-shirt', bottoms: ['beige-shorts', 'charcoal-shorts', 'white-barrel', 'olive-wide'], smart: true, outdoors: true, reason: 'The navy short-sleeve shirt gives summer basics a cleaner finish. Shorts suit daytime plans; full-length trousers suit casual evenings.' },
    { title: 'White, well considered', top: 'white-shirt', bottoms: ['beige-shorts', 'charcoal-shorts', 'grey-slacks', 'beige-trousers'], smart: true, outdoors: true, reason: 'A white short-sleeve shirt keeps this light and neat. Choose the trouser version for a casual dinner or date.' },
    { title: 'The summer teal shirt', top: 'teal-shirt', bottoms: ['black-shorts', 'beige-shorts', 'grey-slacks', 'black-ankle'], smart: true, outdoors: true, reason: 'Teal supplies the colour while a neutral bottom keeps the outfit simple. An open collar and tidy proportions make it feel easy.' },
    { title: 'Muted green, open plans', top: 'green-tee', bottoms: ['charcoal-shorts', 'black-shorts', 'white-barrel', 'beige-trousers'], outdoors: true, reason: 'Your muted green tee works with quiet neutrals for relaxed summer errands, walks and afternoons with friends.' },
    { title: 'A little summer yellow', top: 'yellow-tee', bottoms: ['beige-shorts', 'charcoal-shorts', 'black-ankle', 'white-barrel'], outdoors: true, reason: 'Let the plain yellow UNIQLO tee be the accent. Neutral bottoms and familiar sneakers keep it grounded.' },
    { title: 'The pink weekend', top: 'pink-tee', bottoms: ['beige-shorts', 'black-shorts', 'olive-wide', 'grey-slacks'], outdoors: true, reason: 'Muted pink brings a softer accent to your summer wardrobe. The simple trouser or shorts pairing keeps it casual.' },
  ],
}

const pieces = new Map(garments.map(piece => [piece.id, piece]))
const shoes = ['adidas-striped', 'adidas-black', 'converse-black', 'skechers-white', 'skechers-taupe']
const key = (items: Outfit['items']) => ['tops', 'layers', 'bottoms', 'shoes'].map(slot => items[slot as keyof typeof items] || '').join('|')

/** A bounded editorial edit: curated garment/palette pairings, not a cartesian wardrobe dump. */
export function createSeasonalEdit02(existing: Outfit[]): Outfit[] {
  const used = new Set(existing.map(look => key(look.items)))
  const result: Outfit[] = []
  for (const season of Object.keys(templates) as Season[]) {
    let sequence = 0
    templates[season].forEach((template, templateIndex) => template.bottoms.forEach((bottomId, bottomIndex) => {
      const bottom = pieces.get(bottomId)!
      const candidates = shoes.map((_, index) => shoes[(index + templateIndex + bottomIndex) % shoes.length])
      const shoe = candidates.find(id => !used.has(key({ tops: template.top, layers: template.layer, bottoms: bottomId, shoes: id })))
      if (!shoe) throw new Error(`No new shoe pairing for ${season} / ${template.title}`)
      const items = { tops: template.top, ...(template.layer ? { layers: template.layer } : {}), bottoms: bottomId, shoes: shoe }
      used.add(key(items))
      const smart = template.smart && bottom.style !== 'shorts'
      const occasions: Occasion[] = ['Everyday', 'With friends', 'Date night']
      if (smart) occasions.push('Dinner')
      if (template.outdoors) occasions.push('Outdoors')
      sequence++
      result.push({
        id: `styled-${season.toLowerCase()}-edit02-${String(sequence).padStart(2, '0')}`,
        origin: 'styled',
        name: `${template.title} · ${bottom.colorName.toLowerCase()}`,
        subtitle: [pieces.get(template.top)!.name, template.layer && pieces.get(template.layer)!.name, bottom.name].filter(Boolean).join(' + '),
        items, seasons: [season], occasions,
        source: season === 'Summer' ? 'ss' : 'aw-updated', sourceIndex: -1,
        sourceLabel: `Styled from your wardrobe · ${season} · Edit 02`,
        vibe: smart ? 'Relaxed evening' : template.outdoors ? 'Day out' : 'Easy everyday',
        note: `${template.reason} Finish with ${pieces.get(shoe)!.name.toLowerCase()}.`,
      })
    }))
  }
  return result
}
