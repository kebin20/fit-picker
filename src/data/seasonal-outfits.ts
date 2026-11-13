import type { Occasion, Outfit, Season } from '../types'

interface StyledBrief {
  id: string
  name: string
  subtitle: string
  items: Outfit['items']
  season: Season
  occasions: Occasion[]
  source: Outfit['source']
  vibe: string
  note: string
  edit?: string
}

function styledLook({ season, edit = '01', ...brief }: StyledBrief): Outfit {
  return {
    ...brief,
    origin: 'styled',
    image: `/outfits/${brief.id}.webp`,
    seasons: [season],
    sourceIndex: -1,
    sourceLabel: `Styled from your wardrobe · ${season} · Edit ${edit}`,
  }
}

// New styling ideas, composed from confirmed catalogue pieces. These are not
// combinations transcribed from the original guides. Images illustrate styling,
// rather than exact prints, garment fit or fabric behaviour.
//
// To extend the collection gradually: append another edit array, give its looks
// stable new ids and edit: '02', add the corresponding /public/outfits/*.webp
// images, then spread it into seasonalOutfits below. Existing ids stay stable.
const edit01: Outfit[] = [
  styledLook({
    id: 'styled-autumn-01',
    name: 'Navy after hours',
    subtitle: 'Navy shirt, brown overshirt & grey slacks',
    items: { tops: 'navy-shirt', layers: 'brown-overshirt', bottoms: 'grey-slacks', shoes: 'adidas-black' },
    season: 'Autumn',
    occasions: ['Everyday', 'Dinner', 'Date night'],
    source: 'aw-core',
    vibe: 'Smart casual',
    note: 'A navy button shirt and grey slacks keep the look neat; the open brown overshirt adds an earthy autumn layer. Finish with your all-black sneakers.',
  }),
  styledLook({
    id: 'styled-autumn-02',
    name: 'Rust & cream',
    subtitle: 'Rust tee, brown overshirt & cream pants',
    items: { tops: 'rust-tee', layers: 'brown-overshirt', bottoms: 'cream-pants', shoes: 'converse-black' },
    season: 'Autumn',
    occasions: ['Everyday', 'With friends'],
    source: 'aw-core',
    vibe: 'Earthy casual',
    note: 'Cream pants lighten the rich rust-and-brown layers. Black low-top Converse make this an easy combination for a café stop or an afternoon with friends.',
  }),
  styledLook({
    id: 'styled-autumn-03',
    name: 'An olive kind of day',
    subtitle: 'Green bomber, off-white sweatshirt & olive wide pants',
    items: { tops: 'offwhite-sweatshirt', layers: 'green-bomber', bottoms: 'olive-wide', shoes: 'adidas-black' },
    season: 'Autumn',
    occasions: ['Everyday', 'With friends', 'Outdoors'],
    source: 'aw-updated',
    vibe: 'Day out',
    note: 'The off-white crewneck breaks up the olive bomber and wide pants. A comfortable layered option for a mild autumn day out, finished with black sneakers.',
  }),
  styledLook({
    id: 'styled-winter-01',
    name: 'A warm welcome',
    subtitle: 'Beige coat, light brown hoodie & grey slacks',
    items: { tops: 'brown-hoodie', layers: 'beige-coat', bottoms: 'grey-slacks', shoes: 'skechers-white' },
    season: 'Winter',
    occasions: ['Everyday', 'Dinner', 'Date night'],
    source: 'aw-updated',
    vibe: 'Relaxed evening',
    note: 'A beige coat brings structure to the light brown hoodie. Grey slacks and all-white sneakers keep this relaxed enough for a casual dinner or date.',
  }),
  styledLook({
    id: 'styled-winter-02',
    name: 'Flannel, staying in',
    subtitle: 'Brown flannel, navy sweatshirt & black barrel pants',
    items: { tops: 'navy-sweatshirt', layers: 'brown-flannel', bottoms: 'black-barrel', shoes: 'converse-black' },
    season: 'Winter',
    occasions: ['Everyday', 'With friends'],
    source: 'aw-updated',
    vibe: 'Indoor get-together',
    note: 'Navy and black give the brown flannel a quiet backdrop. A sweatshirt under the open flannel works for indoor get-togethers or milder winter days; choose a coat or puffer for extended time in the cold.',
  }),
  styledLook({
    id: 'styled-winter-03',
    name: 'The winter walk',
    subtitle: 'Black puffer, navy sweatshirt & olive wide pants',
    items: { tops: 'navy-sweatshirt', layers: 'black-puffer', bottoms: 'olive-wide', shoes: 'adidas-black' },
    season: 'Winter',
    occasions: ['Everyday', 'With friends', 'Outdoors'],
    source: 'aw-updated',
    vibe: 'Winter day out',
    note: 'Your warm puffer sits over a navy crewneck, with olive wide pants adding colour to the dark layers. Black sneakers keep the finish simple for a winter day out.',
  }),
  styledLook({
    id: 'styled-spring-01',
    name: 'A lighter evening',
    subtitle: 'White shirt, beige trousers & all-white Skechers',
    items: { tops: 'white-shirt', bottoms: 'beige-trousers', shoes: 'skechers-white' },
    season: 'Spring',
    occasions: ['Everyday', 'Dinner', 'Date night'],
    source: 'ss',
    vibe: 'Clean casual',
    note: 'A white short-sleeve button shirt and beige trousers make a light, neat combination for a warm spring evening. All-white sneakers keep the palette consistent.',
  }),
  styledLook({
    id: 'styled-spring-02',
    name: 'Teal, take it easy',
    subtitle: 'Teal shirt over cream tee, black ankle trousers & Converse',
    items: { tops: 'cream-tee', layers: 'teal-shirt', bottoms: 'black-ankle', shoes: 'converse-black' },
    season: 'Spring',
    occasions: ['Everyday', 'With friends', 'Date night'],
    source: 'ss',
    vibe: 'Casual meet-up',
    note: 'Wear the teal short-sleeve shirt open over a cream tee. Black ankle trousers and low-top Converse balance the colour for a warm spring café date or meet-up.',
  }),
  styledLook({
    id: 'styled-spring-03',
    name: 'Out for the afternoon',
    subtitle: 'Navy bomber, white tee & olive wide pants',
    items: { tops: 'white-tee', layers: 'navy-bomber', bottoms: 'olive-wide', shoes: 'skechers-taupe' },
    season: 'Spring',
    occasions: ['Everyday', 'With friends', 'Outdoors'],
    source: 'aw-updated',
    vibe: 'Spring day out',
    note: 'A white tee keeps the navy bomber and olive pants feeling fresh. Your taupe slip-ins give this easy day-out combination a softer finish on cooler spring days.',
  }),
  styledLook({
    id: 'styled-summer-01',
    name: 'Brown at sundown',
    subtitle: 'Brown shirt, black ankle trousers & white Adidas',
    items: { tops: 'brown-shirt', bottoms: 'black-ankle', shoes: 'adidas-striped' },
    season: 'Summer',
    occasions: ['Everyday', 'Dinner', 'Date night'],
    source: 'ss',
    vibe: 'Summer smart casual',
    note: 'A brown short-sleeve button shirt and black ankle trousers make a simple evening outfit. White Adidas with black stripes add a clean contrast without another layer.',
  }),
  styledLook({
    id: 'styled-summer-02',
    name: 'The green weekend',
    subtitle: 'Muted green tee, beige shorts & Converse',
    items: { tops: 'green-tee', bottoms: 'beige-shorts', shoes: 'converse-black' },
    season: 'Summer',
    occasions: ['Everyday', 'With friends', 'Outdoors'],
    source: 'ss',
    vibe: 'Weekend casual',
    note: 'Muted green and beige bring together two easy summer neutrals. Black low-top Converse give the relaxed tee-and-shorts combination a streetwear finish.',
  }),
  styledLook({
    id: 'styled-summer-03',
    name: 'Light plans',
    subtitle: 'Cream tee, charcoal shorts & taupe slip-ins',
    items: { tops: 'cream-tee', bottoms: 'charcoal-shorts', shoes: 'skechers-taupe' },
    season: 'Summer',
    occasions: ['Everyday', 'With friends', 'Outdoors'],
    source: 'ss',
    vibe: 'Hot-day outing',
    note: 'A cream tee lifts the charcoal shorts, while taupe slip-ins soften the contrast. A light combination for errands, a casual walk or meeting friends on a hot day.',
  }),
]

export const seasonalOutfits: Outfit[] = [...edit01]
