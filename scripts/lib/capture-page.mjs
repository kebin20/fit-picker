import sharp from 'sharp'

/** Tile long documents to stay below software GPU screenshot texture limits. */
export async function capturePage(page,path) {
  await page.evaluate(()=>document.fonts.ready)
  const {width,height}=await page.evaluate(()=>({width:innerWidth,height:Math.max(document.documentElement.scrollHeight,innerHeight)}))
  const tiles=[]
  const session=await page.context().newCDPSession(page)
  try{
    for(let top=0;top<height;top+=4096){
      const {data}=await session.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:top,width,height:Math.min(4096,height-top),scale:1}})
      tiles.push({input:Buffer.from(data,'base64'),left:0,top})
    }
  }finally{await session.detach()}
  await sharp({create:{width,height,channels:4,background:'#f9faf7'}}).composite(tiles).png().toFile(path)
}
