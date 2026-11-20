// Bundle only catalogue data for local asset preparation; no server or browser.
import {build} from 'esbuild'
export async function wardrobeData(){
 const {outputFiles}=await build({stdin:{contents:"export {garments,outfits} from './src/data/wardrobe.ts'; export {seasonalOutfits} from './src/data/seasonal-outfits.ts'; export {guideQuickIdeas} from './src/data/guide-quick-ideas.ts'; export {curatedOutfitIds} from './src/data/curated-outfits.ts'; export {rankOutfits} from './src/lib/rank-outfits.ts'; export {outfitAppearance,outfitSummary} from './src/lib/outfit-appearance.ts'",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',loader:{'.png':'empty'}})
 return import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`)
}
