import {describe,it,expect} from 'vitest'
import {upsertSavedLook,type SavedLook} from './saved-looks'
import {sameSelection} from './wardrobe'

const a={tops:'rust-tee',bottoms:'grey-slacks',shoes:'adidas-black'}
const b={tops:'white-tee',bottoms:'olive-wide',shoes:'converse-black'}
const saved:SavedLook[]=[{id:'a',name:'First',items:a,saved:'2026-11-01'},{id:'b',name:'Second',items:b,saved:'2026-11-02'}]
describe('saved look updates',()=>{
  it('merges an edit into an existing combination without duplicate saved outfits',()=>{
    const next=upsertSavedLook(saved,b,'Updated first','a')
    expect(next).toHaveLength(1)
    expect(next[0]).toMatchObject({id:'a',name:'Updated first',items:b})
  })
  it('uses an existing duplicate rather than reviving a deleted editing ID',()=>{
    expect(upsertSavedLook(saved,b,'Second again','missing')[0].id).toBe('b')
  })
  it('compares clothing slots independently of JSON property insertion order',()=>{
    expect(sameSelection(a,{shoes:'adidas-black',tops:'rust-tee',bottoms:'grey-slacks'})).toBe(true)
    expect(sameSelection(a,b)).toBe(false)
  })
})
