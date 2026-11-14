import {describe,it,expect} from 'vitest'
import {defaults,validatePersonal,weatherSuitable,validSelection} from './personal'
import {garments} from '../data/wardrobe'
describe('personal wardrobe data',()=>{
 it('round trips preferences and rejects malformed photo/import data',()=>{expect(validatePersonal({...defaults,draft:{tops:'white-tee'}}).draft?.tops).toBe('white-tee');expect(()=>validatePersonal({...defaults,locks:['unknown']})).toThrow();expect(()=>validatePersonal({...defaults,history:[{date:'bad',items:{}}]})).toThrow();expect(validSelection({tops:{}})).toBe(false)})
 it('respects warmth and requires a rain shell rather than assuming a coat is waterproof',()=>{const g=(id:string)=>garments.find(g=>g.id===id)!;expect(weatherSuitable([g('white-tee'),g('beige-shorts')],'7',false)).toBe(false);expect(weatherSuitable([g('black-puffer'),g('white-tee')],'27',false)).toBe(false);expect(weatherSuitable([g('beige-coat')],'12',true)).toBe(false);expect(weatherSuitable([g('black-rain-jacket'),g('navy-sweatshirt')],'12',true)).toBe(true)})
})
