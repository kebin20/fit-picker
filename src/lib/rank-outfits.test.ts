import {describe,it,expect} from 'vitest'
import {outfits} from '../data/wardrobe'
import {rankOutfits} from './rank-outfits'

describe('personal outfit ranking',()=>{
  it('prioritizes favourites, then less-worn looks, while retaining tie order',()=>{
    const looks=outfits.slice(0,4),now=Date.parse('2026-11-16T12:00:00Z')
    const history=[{date:'2026-11-15',items:looks[0].items},{date:'2026-11-15',items:looks[0].items},{date:'2026-11-14',items:looks[3].items}]
    expect(rankOutfits(looks,[looks[3].id],history,now).map(o=>o.id)).toEqual([looks[3].id,looks[1].id,looks[2].id,looks[0].id])
    expect(looks).toEqual(outfits.slice(0,4))
  })
  it('compares physical clothing slots independently of object order and ignores old/invalid dates',()=>{
    const [a,b]=outfits,now=Date.parse('2026-11-16T12:00:00Z')
    const items={shoes:a.items.shoes,bottoms:a.items.bottoms,tops:a.items.tops,layers:a.items.layers}
    const history=[{date:'2026-11-16',items},{date:'2026-10-01',items:b.items},{date:'invalid',items:b.items}]
    expect(rankOutfits([a,b],[],history,now).map(o=>o.id)).toEqual([b.id,a.id])
  })
})
