import {describe,it,expect} from 'vitest'
import {validateBackup} from './backup'
import {defaults,validatePersonal} from './personal'
import {garments} from '../data/wardrobe'
import {ownedSelection} from './wardrobe'

const look={id:'look',name:'Test look',items:{tops:'white-tee',bottoms:'grey-slacks',shoes:'adidas-black'},saved:'2026-11-01'}
const backup=()=>({version:1,personal:{...defaults},saved:[look]})
describe('backup integrity',()=>{
  it('rejects duplicate saved IDs before replacing any current data',()=>{
    expect(()=>validateBackup({...backup(),saved:[look,{...look,name:'Another'}]},garments)).toThrow('Duplicate saved look IDs')
  })
  it('rejects impossible clothing slots and one physical item worn twice',()=>{
    expect(()=>validateBackup({...backup(),personal:{...defaults,draft:{tops:'grey-slacks'}}},garments)).toThrow('invalid clothing slot')
    expect(()=>validateBackup({...backup(),saved:[{...look,items:{...look.items,tops:'navy-shirt',layers:'navy-shirt'}}]},garments)).toThrow('Invalid saved looks')
  })
  it('prevents a catalogue item being reassigned to a different category by import',()=>{
    const original=garments.find(g=>g.id==='navy-shirt')!
    expect(()=>validateBackup({...backup(),personal:{...defaults,edits:[{...original,category:'bottoms',style:'trousers'}]}},garments)).toThrow('cannot change clothing category')
  })
  it('preserves known removed items for saved-look repair',()=>{
    expect(validateBackup({...backup(),saved:[{...look,items:{...look.items,tops:'white-shirt'}}]},garments).saved[0].items.tops).toBe('white-shirt')
  })
  it('sanitizes invalid stored drafts without throwing away remaining usable pieces',()=>{
    expect(ownedSelection({tops:'grey-slacks',bottoms:'olive-wide',shoes:'adidas-black'},garments)).toEqual({bottoms:'olive-wide',shoes:'adidas-black'})
    expect(ownedSelection({tops:'navy-shirt',layers:'navy-shirt',bottoms:'olive-wide'},garments)).toEqual({tops:'navy-shirt',bottoms:'olive-wide'})
  })
  it('rejects malformed optional fields, incompatible garment types and impossible wear dates',()=>{
    const top=garments.find(g=>g.id==='white-tee')!
    for(const patch of [{style:'shorts'},{note:0},{photo:0},{pattern:'unknown'},{colorName:'x'.repeat(61)},{wearableAs:0},{wearableAs:false},{wearableAs:null},{warmth:0},{warmth:false},{warmth:''}]){
      expect(()=>validatePersonal({...defaults,edits:[{...top,...patch}]})).toThrow()
    }
    for(const value of [0,false,null,'']){
      expect(()=>validatePersonal({...defaults,season:value})).toThrow('Invalid season')
      expect(()=>validatePersonal({...defaults,occasion:value})).toThrow('Invalid occasion')
    }
    expect(()=>validatePersonal({...defaults,history:[{date:'2026-02-31',items:look.items}]})).toThrow('Invalid wear history')
    expect(()=>validatePersonal({...defaults,history:[null]})).toThrow('Invalid wear history')
    expect(validatePersonal({...defaults,history:[{date:'2026-11-16',items:look.items}]}).history).toHaveLength(1)
  })
})
