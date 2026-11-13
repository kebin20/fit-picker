import type { Category, Garment, GarmentStyle, Occasion, Outfit, Season } from '../types'

export { sourceGuides as sources } from './source-guides'

const all: Season[] = ['Autumn', 'Winter', 'Spring', 'Summer']
const cool: Season[] = ['Autumn', 'Winter', 'Spring']
const warm: Season[] = ['Spring', 'Summer']

function garment(
  id: string, name: string, category: Category, style: GarmentStyle,
  color: string, colorName: string, source: Garment['source'],
  options: Partial<Garment> = {},
): Garment {
  return { id, name, category, style, color, colorName, source, seasons: all, ownership: 'confirmed', ...options }
}

// The updated collection wins where the guides describe the same piece.
// Distinct cuts/prints remain distinct; ambiguous naming is recorded in notes.
export const garments: Garment[] = [
  garment('navy-shirt', 'Navy short-sleeve shirt', 'tops', 'shirt', '#233344', 'Navy', 'ss', { wearableAs: ['layers'], note: 'Short-sleeve shirt in the core and summer guides; distinct from the updated navy overshirt.' }),
  garment('brown-flannel', 'Solid brown flannel shirt', 'tops', 'shirt', '#75523a', 'Brown', 'aw-updated', { wearableAs: ['layers'], seasons: cool, note: 'Confirmed by you as solid brown, with no stripes or checks. Can be worn alone or open as a layer.' }),
  garment('ainu-longsleeve', 'Grey Ainu long-sleeve tee', 'tops', 'longsleeve', '#a7aaa8', 'Grey', 'aw-updated', { seasons: cool, pattern: 'graphic' }),
  garment('rust-tee', 'Rust tee', 'tops', 'tee', '#a44c2e', 'Rust', 'aw-updated'),
  garment('white-tee', 'White tee', 'tops', 'tee', '#f3f0e8', 'White', 'aw-core'),
  garment('cream-graphic-tee', 'Cream graphic tee', 'tops', 'tee', '#e8dfcd', 'Cream', 'aw-core', { pattern: 'graphic', note: 'The core guide shows a cream illustrated tee. Kept separate from the white graphic tee because the print is not clearly the same.' }),
  garment('navy-sweatshirt', 'Navy sweatshirt', 'tops', 'sweatshirt', '#243343', 'Navy', 'aw-updated', { seasons: cool, note: 'UNIQLO:C; confirmed in the updated actual collection, although the older core guide labels navy sweatshirts as recommended.' }),
  garment('offwhite-sweatshirt', 'Off-white sweatshirt', 'tops', 'sweatshirt', '#e9e1cf', 'Off white', 'aw-updated', { seasons: cool }),
  garment('white-hoodie', 'White hoodie', 'tops', 'hoodie', '#f1eee7', 'White', 'aw-updated', { seasons: cool }),
  garment('brown-hoodie', 'Light brown hoodie', 'tops', 'hoodie', '#9a826b', 'Light brown', 'aw-updated', { seasons: cool }),
  garment('navy-overshirt', 'Navy overshirt', 'tops', 'overshirt', '#263449', 'Navy', 'aw-updated', { wearableAs: ['layers'], seasons: cool, note: 'Low-contrast long-sleeve overshirt in the updated guide.' }),
  garment('check-overshirt', 'Check overshirt', 'tops', 'overshirt', '#bda078', 'Beige check', 'aw-updated', { wearableAs: ['layers'], seasons: cool, pattern: 'check', note: 'Labelled “Burberry Style” in the source; not a verified brand identification.' }),
  garment('white-graphic-tee', 'White graphic tee', 'tops', 'tee', '#efede5', 'White', 'aw-updated', { pattern: 'graphic', note: 'White chest-logo/back-graphic tee in the updated collection. The summer guide uses a white graphic tee; exact print placement in the 3D preview is illustrative.' }),
  garment('black-cat-tee', 'Black cat graphic tee', 'tops', 'tee', '#282925', 'Black', 'aw-updated', { pattern: 'graphic', note: 'Updated guide labels a cat-and-coffee design; summer R1 says graphic tee (cat). The chart illustrations vary, so the 3D graphic is illustrative.' }),
  garment('green-tee', 'Muted green tee', 'tops', 'tee', '#68775a', 'Muted green', 'aw-updated'),
  garment('pink-tee', 'Pink Adidas tee', 'tops', 'tee', '#d9919d', 'Muted pink', 'ss', { pattern: 'graphic', seasons: warm }),
  garment('cream-tee', 'Cream tee', 'tops', 'tee', '#e9e1ce', 'Cream', 'aw-updated'),
  garment('ukiyoe-tee', 'Yellow Ukiyoe tee', 'tops', 'tee', '#cda131', 'Dark yellow', 'aw-updated', { pattern: 'graphic', note: 'The illustrated Ukiyoe print makes this distinct from the plain yellow UNIQLO tee in the summer guide.' }),
  garment('yellow-tee', 'Yellow UNIQLO tee', 'tops', 'tee', '#e0c127', 'Yellow', 'ss', { seasons: warm }),
  garment('navy-tee', 'Navy tee', 'tops', 'tee', '#273548', 'Navy', 'ss'),
  garment('brown-tee', 'Brown tee', 'tops', 'tee', '#69503d', 'Brown', 'ss'),
  garment('teal-shirt', 'Teal shirt', 'tops', 'shirt', '#2c6b75', 'Teal', 'ss', { wearableAs: ['layers'], seasons: warm }),
  garment('brown-shirt', 'Brown short-sleeve shirt', 'tops', 'shirt', '#78533d', 'Brown', 'ss', { wearableAs: ['layers'], seasons: warm, note: 'Summer smart-casual shirt, distinct from the brown flannel.' }),
  garment('white-shirt', 'White shirt', 'tops', 'shirt', '#eeede6', 'White', 'ss', { wearableAs: ['layers'], seasons: warm }),
  garment('burton-tee', 'Black Burton tee', 'tops', 'tee', '#252826', 'Black', 'ss', { pattern: 'graphic', seasons: warm }),
  garment('black-tee', 'Black tee', 'tops', 'tee', '#2c2e2c', 'Black', 'ss', { note: 'Plain black tee shown in summer F4; distinct from the graphic tees.' }),
  garment('white-longsleeve', 'White long-sleeve tee', 'tops', 'longsleeve', '#edede8', 'White', 'ss', { seasons: cool, note: 'Shown in the summer guide’s tops catalogue; distinct from the grey Ainu tee.' }),
  garment('grey-sweatshirt', 'Grey sweatshirt', 'tops', 'sweatshirt', '#a9aaa8', 'Grey', 'aw-core', { seasons: cool, ownership: 'recommended', note: 'Suggested purchase in the core guide; not confirmed in the updated actual collection.' }),
  garment('olive-sweatshirt', 'Olive sweatshirt', 'tops', 'sweatshirt', '#626747', 'Olive', 'aw-core', { seasons: cool, ownership: 'recommended', note: 'Suggested purchase in the core guide; not confirmed in the updated actual collection.' }),

  garment('beige-coat', 'Beige single-breasted coat', 'layers', 'coat', '#bda988', 'Beige', 'aw-updated', { seasons: ['Autumn', 'Winter'] }),
  garment('navy-bomber', 'Navy bomber', 'layers', 'bomber', '#263446', 'Navy', 'aw-updated', { seasons: cool }),
  garment('green-bomber', 'Green bomber', 'layers', 'bomber', '#616b43', 'Olive green', 'aw-updated', { seasons: cool }),
  garment('black-puffer', 'Black GU puffer', 'layers', 'puffer', '#2c2d2c', 'Black', 'aw-updated', { seasons: ['Winter'] }),
  garment('brown-overshirt', 'Brown overshirt', 'layers', 'overshirt', '#84664b', 'Brown', 'aw-core', { seasons: cool, note: 'Separate overshirt listed in the core guide. Not merged with the flannel because the guide lists both.' }),
  garment('black-rain-jacket', 'Black rain jacket', 'layers', 'raincoat', '#252a29', 'Black', 'aw-core', { seasons: cool }),

  garment('white-barrel', 'White barrel pants', 'bottoms', 'trousers', '#e9e5d9', 'White', 'aw-updated', { note: 'Wide white barrel cut in the updated wardrobe. Summer C2’s “white trousers” are mapped here; exact cut in that drawing is uncertain.' }),
  garment('brown-barrel', 'Brown barrel pants', 'bottoms', 'trousers', '#735e49', 'Brown', 'aw-updated', { note: 'Updated wide brown barrel pants; mapped to the core guide’s brown pants because no separate brown pair is established.' }),
  garment('black-barrel', 'Black barrel pants', 'bottoms', 'trousers', '#30322e', 'Black', 'aw-updated', { note: 'UNIQLO:C wide barrel pants; distinct from the summer ankle trousers.' }),
  garment('olive-wide', 'Olive wide pants', 'bottoms', 'trousers', '#6c714a', 'Olive', 'aw-updated', { note: 'Called olive pants or olive chef pants across the guides.' }),
  garment('grey-slacks', 'Grey slacks', 'bottoms', 'trousers', '#777a74', 'Grey', 'aw-updated', { note: 'Updated guide labels slim fit. Summer “grey trousers” map to this confirmed grey pair; the illustrated proportions differ.' }),
  garment('cream-pants', 'Cream pants', 'bottoms', 'trousers', '#d9cdb4', 'Cream', 'aw-core', { note: 'Older core guide uses cream pants. Kept separate from updated white barrel pants because colour/cut equivalence is unconfirmed.' }),
  garment('beige-trousers', 'Beige trousers', 'bottoms', 'trousers', '#c9b894', 'Beige', 'ss', { note: 'Beige pants appear in the core guide as well. Distinct from cream pants and white barrel pants.' }),
  garment('black-ankle', 'Black ankle trousers', 'bottoms', 'trousers', '#363935', 'Black', 'ss', { note: 'Summer catalogue calls these black ankle trousers; C5/S4 call them charcoal trousers. Mapped to the same dark tapered pair.' }),
  garment('beige-shorts', 'Beige shorts', 'bottoms', 'shorts', '#cbbd9d', 'Beige', 'ss', { seasons: warm }),
  garment('charcoal-shorts', 'Charcoal shorts', 'bottoms', 'shorts', '#575c56', 'Charcoal', 'ss', { seasons: warm }),
  garment('black-shorts', 'Black shorts', 'bottoms', 'shorts', '#2d322e', 'Black', 'ss', { seasons: warm }),

  garment('adidas-striped', 'White Adidas · black stripes', 'shoes', 'sneakers', '#eeeee7', 'White / black', 'aw-updated', { pattern: 'stripes' }),
  garment('adidas-black', 'All-black Adidas sneakers', 'shoes', 'sneakers', '#282b29', 'Black', 'aw-updated', { note: 'Mapped to “black sneakers” in the core/summer guides; no distinct plain black pair is established.' }),
  garment('skechers-white', 'All-white Skechers', 'shoes', 'sneakers', '#eeefea', 'White', 'aw-updated'),
  garment('converse-black', 'Black Converse low', 'shoes', 'canvas', '#292e2c', 'Black / white', 'aw-updated', { note: 'The updated actual footwear collection confirms low-top Converse. Some summer outfit illustrations show high tops; this prototype uses the confirmed low pair.' }),
  garment('skechers-taupe', 'Taupe Skechers slip-ins', 'shoes', 'slipons', '#a28e73', 'Taupe', 'aw-updated'),
]

const aw: Season[] = ['Autumn', 'Winter']
const autumn: Season[] = ['Autumn']
const winter: Season[] = ['Winter']
const everyday: Occasion[] = ['Everyday', 'With friends']
const smart: Occasion[] = ['Everyday', 'Dinner', 'Date night', 'With friends']
const casualDate: Occasion[] = ['Everyday', 'Date night', 'With friends']
const outside: Occasion[] = ['Everyday', 'With friends', 'Outdoors']

function outfit(
  id: string, name: string, subtitle: string, tops: string, bottoms: string, shoes: string,
  source: Outfit['source'], sourceIndex: number, seasons: Season[], occasions: Occasion[],
  vibe: string, layers?: string, note?: string,
): Outfit {
  const sourceLabel = source === 'ss'
    ? `Summer guide · ${id.replace('ss-', '').toUpperCase()}`
    : source === 'aw-core'
      ? `Core guide · look ${sourceIndex + 1}`
      : `Updated guide · ${sourceIndex < 8 ? 'autumn' : 'winter'} look ${(sourceIndex % 8) + 1}`
  return { id, name, subtitle, items: { tops, bottoms, shoes, ...(layers ? { layers } : {}) }, source, sourceIndex, sourceLabel, seasons, occasions, vibe, ...(note ? { note } : {}) }
}

// Occasion/season/vibe tags and short names are editorial metadata for filtering.
// Garment combinations and their order are transcribed from the PNGs.
// sourceIndex is zero-based: core 0–7, updated 0–15, summer 0–29.
export const outfits: Outfit[] = [
  outfit('aw-autumn-1', 'A little more considered', 'Beige coat, navy sweatshirt & white barrel pants', 'navy-sweatshirt', 'white-barrel', 'adidas-striped', 'aw-updated', 0, autumn, smart, 'Clean casual', 'beige-coat'),
  outfit('aw-autumn-2', 'Earth tones, easy layers', 'Brown flannel, white tee & brown barrel pants', 'white-tee', 'brown-barrel', 'skechers-taupe', 'aw-updated', 1, autumn, casualDate, 'Relaxed layers', 'brown-flannel'),
  outfit('aw-autumn-3', 'Quiet contrast', 'Off-white sweatshirt & olive wide pants', 'offwhite-sweatshirt', 'olive-wide', 'adidas-black', 'aw-updated', 2, autumn, everyday, 'Clean casual'),
  outfit('aw-autumn-4', 'Checks & Converse', 'Check overshirt, white tee & black barrel pants', 'white-tee', 'black-barrel', 'converse-black', 'aw-updated', 3, autumn, everyday, 'Relaxed / street', 'check-overshirt'),
  outfit('aw-autumn-5', 'Green light', 'Green bomber, white hoodie & grey slacks', 'white-hoodie', 'grey-slacks', 'skechers-white', 'aw-updated', 4, autumn, outside, 'Everyday layers', 'green-bomber'),
  outfit('aw-autumn-6', 'A little Ukiyoe', 'Navy bomber, Ukiyoe tee & brown barrel pants', 'ukiyoe-tee', 'brown-barrel', 'skechers-taupe', 'aw-updated', 5, autumn, everyday, 'Relaxed / street', 'navy-bomber'),
  outfit('aw-autumn-7', 'Monochrome weekend', 'White hoodie & black barrel pants', 'white-hoodie', 'black-barrel', 'adidas-striped', 'aw-updated', 6, autumn, everyday, 'Relaxed / street'),
  outfit('aw-autumn-8', 'Soft neutrals', 'Light brown hoodie & white barrel pants', 'brown-hoodie', 'white-barrel', 'converse-black', 'aw-updated', 7, autumn, everyday, 'Relaxed / street'),
  outfit('aw-winter-1', 'Winter in white', 'Puffer, off-white sweatshirt & white barrel pants', 'offwhite-sweatshirt', 'white-barrel', 'adidas-striped', 'aw-updated', 8, winter, outside, 'Warm & functional', 'black-puffer'),
  outfit('aw-winter-2', 'Warm neutrals', 'Beige coat, off-white sweatshirt & brown barrel pants', 'offwhite-sweatshirt', 'brown-barrel', 'skechers-white', 'aw-updated', 9, winter, smart, 'Clean casual', 'beige-coat'),
  outfit('aw-winter-3', 'Navy, black & beige', 'Beige coat, navy sweatshirt & black barrel pants', 'navy-sweatshirt', 'black-barrel', 'converse-black', 'aw-updated', 10, winter, smart, 'Clean casual', 'beige-coat'),
  outfit('aw-winter-4', 'An easy winter layer', 'Navy bomber, white hoodie & olive wide pants', 'white-hoodie', 'olive-wide', 'adidas-black', 'aw-updated', 11, winter, outside, 'Relaxed layers', 'navy-bomber'),
  outfit('aw-winter-5', 'Flannel & off white', 'Brown flannel, off-white sweatshirt & grey slacks', 'offwhite-sweatshirt', 'grey-slacks', 'skechers-white', 'aw-updated', 12, winter, casualDate, 'Textured casual', 'brown-flannel'),
  outfit('aw-winter-6', 'A winter check', 'Check overshirt, navy sweatshirt & brown barrel pants', 'navy-sweatshirt', 'brown-barrel', 'skechers-taupe', 'aw-updated', 13, winter, everyday, 'Relaxed layers', 'check-overshirt'),
  outfit('aw-winter-7', 'Ainu, layered up', 'Puffer, Ainu long-sleeve tee & grey slacks', 'ainu-longsleeve', 'grey-slacks', 'adidas-striped', 'aw-updated', 14, winter, outside, 'Warm & functional', 'black-puffer'),
  outfit('aw-winter-8', 'A graphic under a coat', 'Beige coat, black cat tee & black barrel pants', 'black-cat-tee', 'black-barrel', 'converse-black', 'aw-updated', 15, winter, casualDate, 'Relaxed layers', 'beige-coat'),

  // The core PNG groups both seasons together, but these light, uninsulated
  // combinations are tagged Autumn. Updated winter looks supply warmer layers.
  outfit('aw-core-1', 'Relaxed layers', 'Brown flannel, white tee & cream pants', 'white-tee', 'cream-pants', 'adidas-black', 'aw-core', 0, autumn, smart, 'Clean casual', 'brown-flannel'),
  outfit('aw-core-2', 'Clean & mature', 'Navy shirt & grey slacks', 'navy-shirt', 'grey-slacks', 'adidas-black', 'aw-core', 1, autumn, smart, 'Smart casual', undefined, 'The source explicitly suggests this combination for dates or dinners. The short-sleeve outfit is tagged for milder autumn days, not winter.'),
  outfit('aw-core-3', 'Casual & personal', 'Ainu long-sleeve tee & olive pants', 'ainu-longsleeve', 'olive-wide', 'adidas-black', 'aw-core', 2, autumn, everyday, 'Relaxed / street'),
  outfit('aw-core-4', 'Autumn tones', 'Rust tee, brown overshirt & brown pants', 'rust-tee', 'brown-barrel', 'adidas-black', 'aw-core', 3, autumn, casualDate, 'Relaxed layers', 'brown-overshirt'),
  outfit('aw-core-5', 'Smart casual layer', 'Navy shirt, brown overshirt & cream pants', 'navy-shirt', 'cream-pants', 'adidas-black', 'aw-core', 4, autumn, smart, 'Smart casual', 'brown-overshirt'),
  outfit('aw-core-6', 'Textured & cozy', 'Brown flannel shirt & grey slacks', 'brown-flannel', 'grey-slacks', 'adidas-black', 'aw-core', 5, autumn, casualDate, 'Textured casual'),
  outfit('aw-core-7', 'Sweat casual', 'Navy sweatshirt & cream pants', 'navy-sweatshirt', 'cream-pants', 'adidas-black', 'aw-core', 6, autumn, everyday, 'Clean casual'),
  outfit('aw-core-8', 'Street / outdoor', 'Grey sweatshirt, olive pants & rain jacket', 'grey-sweatshirt', 'olive-wide', 'adidas-black', 'aw-core', 7, aw, outside, 'Outdoor casual', 'black-rain-jacket', 'Contains a suggested grey sweatshirt, not a confirmed owned piece. Excluded from owned-wardrobe recommendations.'),

  outfit('ss-r1', 'Cat tee, out of office', 'Cat graphic tee, olive chef pants & Converse', 'black-cat-tee', 'olive-wide', 'converse-black', 'ss', 0, warm, outside, 'Relaxed / street'),
  outfit('ss-r2', 'Rust, on repeat', 'Rust tee, beige shorts & taupe Skechers', 'rust-tee', 'beige-shorts', 'skechers-taupe', 'ss', 1, warm, outside, 'Relaxed / street'),
  outfit('ss-r3', 'Green & easy', 'Muted green tee, black shorts & white Adidas', 'green-tee', 'black-shorts', 'adidas-striped', 'ss', 2, warm, outside, 'Relaxed / street'),
  outfit('ss-r4', 'A softer pop of colour', 'Pink Adidas tee, charcoal shorts & white Adidas', 'pink-tee', 'charcoal-shorts', 'adidas-striped', 'ss', 3, warm, outside, 'Relaxed / street'),
  outfit('ss-r5', 'A sunny day off', 'Yellow tee, black shorts & Converse', 'yellow-tee', 'black-shorts', 'converse-black', 'ss', 4, warm, outside, 'Relaxed / street'),
  outfit('ss-c1', 'Cream on beige', 'Cream tee, beige trousers & white Adidas', 'cream-tee', 'beige-trousers', 'adidas-striped', 'ss', 5, warm, casualDate, 'Clean casual'),
  outfit('ss-c2', 'A light teal layer', 'Teal shirt over white tee, white trousers & white Adidas', 'white-tee', 'white-barrel', 'adidas-striped', 'ss', 6, warm, casualDate, 'Clean casual', 'teal-shirt'),
  outfit('ss-c3', 'Navy, simply', 'Navy tee, grey trousers & white Adidas', 'navy-tee', 'grey-slacks', 'adidas-striped', 'ss', 7, warm, casualDate, 'Clean casual'),
  outfit('ss-c4', 'An earthy everyday', 'Brown tee, grey trousers & white Adidas', 'brown-tee', 'grey-slacks', 'adidas-striped', 'ss', 8, warm, casualDate, 'Clean casual'),
  outfit('ss-c5', 'White shirt, easy evening', 'White shirt, charcoal trousers & white Adidas', 'white-shirt', 'black-ankle', 'adidas-striped', 'ss', 9, warm, smart, 'Clean casual'),
  outfit('ss-s1', 'Teal, a little smarter', 'Teal shirt, beige trousers & white Adidas', 'teal-shirt', 'beige-trousers', 'adidas-striped', 'ss', 10, warm, smart, 'Smart casual'),
  outfit('ss-s2', 'The navy-shirt standard', 'Navy shirt, grey trousers & white Adidas', 'navy-shirt', 'grey-slacks', 'adidas-striped', 'ss', 11, warm, smart, 'Smart casual'),
  outfit('ss-s3', 'Brown & beige', 'Brown shirt, beige trousers & white Adidas', 'brown-shirt', 'beige-trousers', 'adidas-striped', 'ss', 12, warm, smart, 'Smart casual'),
  outfit('ss-s4', 'An evening in monochrome', 'White shirt, charcoal trousers & black sneakers', 'white-shirt', 'black-ankle', 'adidas-black', 'ss', 13, warm, smart, 'Smart casual'),
  outfit('ss-s5', 'Rust, tucked in', 'Rust tee, grey trousers & black sneakers', 'rust-tee', 'grey-slacks', 'adidas-black', 'ss', 14, warm, smart, 'Smart casual', undefined, 'The source specifies wearing the tee tucked in.'),
  outfit('ss-f1', 'A graphic for the group chat', 'White graphic tee, olive chef pants & Converse', 'white-graphic-tee', 'olive-wide', 'converse-black', 'ss', 15, warm, everyday, 'With friends'),
  outfit('ss-f2', 'Burton & olive', 'Burton tee, olive chef pants & Converse', 'burton-tee', 'olive-wide', 'converse-black', 'ss', 16, warm, everyday, 'With friends'),
  outfit('ss-f3', 'White tee, black trousers', 'White tee, black trousers & white Adidas', 'white-tee', 'black-ankle', 'adidas-striped', 'ss', 17, warm, everyday, 'With friends'),
  outfit('ss-f4', 'Black tee, beige trousers', 'Black tee, beige trousers & Converse', 'black-tee', 'beige-trousers', 'converse-black', 'ss', 18, warm, everyday, 'With friends'),
  outfit('ss-f5', 'Yellow meets olive', 'Yellow tee, olive chef pants & white Adidas', 'yellow-tee', 'olive-wide', 'adidas-striped', 'ss', 19, warm, everyday, 'With friends'),
  outfit('ss-h1', 'The graphic shorts look', 'White graphic tee, charcoal shorts & Converse', 'white-graphic-tee', 'charcoal-shorts', 'converse-black', 'ss', 20, warm, outside, 'Hot days'),
  outfit('ss-h2', 'Yellow, keep it light', 'Yellow tee, charcoal shorts & white Adidas', 'yellow-tee', 'charcoal-shorts', 'adidas-striped', 'ss', 21, warm, outside, 'Hot days'),
  outfit('ss-h3', 'Rust for a hot day', 'Rust tee, black shorts & black sneakers', 'rust-tee', 'black-shorts', 'adidas-black', 'ss', 22, warm, outside, 'Hot days'),
  outfit('ss-h4', 'Soft summer neutrals', 'Cream tee, beige shorts & taupe slip-ins', 'cream-tee', 'beige-shorts', 'skechers-taupe', 'ss', 23, warm, outside, 'Hot days'),
  outfit('ss-h5', 'Teal & shorts', 'Teal shirt, beige shorts & white Adidas', 'teal-shirt', 'beige-shorts', 'adidas-striped', 'ss', 24, warm, casualDate, 'Hot days'),
  outfit('ss-v1', 'Yellow & beige', 'Yellow tee, beige trousers & white Adidas', 'yellow-tee', 'beige-trousers', 'adidas-striped', 'ss', 25, warm, casualDate, 'Yellow variations'),
  outfit('ss-v2', 'Yellow & grey', 'Yellow tee, grey trousers & black sneakers', 'yellow-tee', 'grey-slacks', 'adidas-black', 'ss', 26, warm, casualDate, 'Yellow variations'),
  outfit('ss-v3', 'Yellow & black', 'Yellow tee, black trousers & white Adidas', 'yellow-tee', 'black-ankle', 'adidas-striped', 'ss', 27, warm, casualDate, 'Yellow variations'),
  outfit('ss-v4', 'Yellow, street side', 'Yellow tee, olive chef pants & Converse', 'yellow-tee', 'olive-wide', 'converse-black', 'ss', 28, warm, everyday, 'Yellow variations'),
  outfit('ss-v5', 'Yellow & charcoal shorts', 'Yellow tee, charcoal shorts & white Adidas', 'yellow-tee', 'charcoal-shorts', 'adidas-striped', 'ss', 29, warm, outside, 'Yellow variations'),
]
