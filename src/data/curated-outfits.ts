import type { Outfit } from '../types'

/**
 * The recommendation edit, in editorial order. Keep the original library
 * separate so older saved looks and exact photo matches retain their IDs.
 *
 * Choose complete looks for palette, proportion and season. Keep a different
 * trouser or shoe pairing only when it changes where or how the outfit works.
 */
export const curatedOutfitIds = [
  // Autumn: smart layers, earthy colour, and one checked streetwear look.
  'styled-autumn-01',          // Navy and grey ground the brown overshirt.
  'aw-autumn-1',               // Beige coat and navy crew with clean white barrels.
  'styled-autumn-edit02-06',   // Navy bomber, rust tee and slim grey slacks.
  'aw-autumn-4',               // Checked overshirt over a quiet white-and-black base.
  'styled-autumn-02',          // Cream trousers lighten the brown and rust layers.
  'aw-autumn-5',               // White hoodie and trainers bookend olive and grey.
  'aw-autumn-6',               // A mustard accent against navy and warm brown.
  'aw-core-6',                 // Solid brown flannel and grey slacks for mild days.

  // Winter: a warm walk, a cleaner evening coat and distinct lighter layers.
  'styled-winter-03',          // Black puffer and shoes frame olive wide pants.
  'aw-winter-2',               // Beige, cream and brown with white trainers.
  'aw-winter-3',               // Navy under beige, with a dark, relaxed bottom half.
  'aw-winter-4',               // Navy bomber over a white hoodie for milder days.
  'aw-winter-5',               // Brown flannel and off-white crew for indoor plans.
  'aw-winter-7',               // A grey graphic and slacks under a black puffer.
  'aw-winter-6',               // Check, dark navy and tonal brown for a relaxed layer.

  // Spring: layers for cooler days and simple collars for warmer evenings.
  'styled-spring-03',          // White tee and olive pants soften the navy bomber.
  'ss-c2',                     // An open teal shirt with a bright white base.
  'styled-spring-edit02-13',   // Cream crew, beige trousers and clean white trainers.
  'styled-spring-edit02-22',   // Brown short sleeves with sharp grey slacks.
  'ss-s1',                     // Teal, beige and white for a polished mild day.
  'ss-r1',                     // Olive and black put the tee graphic in focus.
  'ss-s2',                     // Navy shirt and grey slacks with white trainers.

  // Summer: airy pieces, intentional pops of colour and full-length evening options.
  'styled-summer-01',          // Open brown collar, black ankle trousers and white trainers.
  'styled-summer-edit02-01',   // Navy and beige shorts keep the daytime palette simple.
  'ss-r4',                     // Muted pink works with charcoal shorts and white trainers.
  'styled-summer-03',          // Cream and taupe warm up charcoal shorts.
  'styled-summer-edit02-15',   // Muted green, white barrels and white Adidas.
  'ss-h3',                     // Black shorts and sneakers frame the rust tee.
  'ss-f4',                     // Black Burton tee and Converse grounded by beige trousers.
] as const

// These looks answer a specific piece choice and stay out of the seasonal edit.
export const focusGuideIds = new Map([
  ['brown-hoodie', 'styled-winter-01'],
  ['white-graphic-tee', 'ss-h1'],
  ['burton-tee', 'ss-f2'],
])

export const focusRecipes = new Map<string, Outfit>([
  ['navy-overshirt', {
    id: 'focus-navy-overshirt',
    name: 'Navy over white',
    subtitle: '',
    origin: 'styled',
    source: 'aw-updated',
    sourceLabel: 'Built around your pieces',
    sourceIndex: -1,
    items: { tops: 'white-tee', layers: 'navy-overshirt', bottoms: 'grey-slacks', shoes: 'adidas-striped' },
    seasons: ['Autumn', 'Spring'],
    occasions: ['Everyday', 'Dinner', 'Date night', 'With friends'],
    vibe: 'Clean casual',
    note: 'Wear the navy overshirt open so the white tee breaks up the darker layers. Grey slacks sharpen the outfit, and white Adidas echo the tee.',
  }],
  ['black-rain-jacket', {
    id: 'focus-black-rain-jacket',
    name: 'Olive on a rainy day',
    subtitle: '',
    origin: 'styled',
    source: 'aw-updated',
    sourceLabel: 'Built around your pieces',
    sourceIndex: -1,
    items: { tops: 'offwhite-sweatshirt', layers: 'black-rain-jacket', bottoms: 'olive-wide', shoes: 'adidas-black' },
    seasons: ['Autumn', 'Spring'],
    occasions: ['Everyday', 'With friends', 'Outdoors'],
    vibe: 'Rainy day casual',
    note: 'Olive trousers soften the black jacket and sneakers. The off-white crew gives the outfit contrast when you wear the jacket open.',
  }],
])
