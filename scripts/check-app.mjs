import {spawn} from 'node:child_process'
import {once} from 'node:events'
import {setTimeout as delay} from 'node:timers/promises'

// Use an existing deployment when supplied; otherwise own a production preview
// so browser regressions also run reproducibly in CI.
const url=process.env.FIT_PICKER_URL || 'http://127.0.0.1:5175/'
let server
try {
  if(!process.env.FIT_PICKER_URL) {
    server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','5175','--strictPort'],{stdio:'inherit'})
    let ready=false
    for(let attempt=0;attempt<60;attempt++) {
      if(server.exitCode!==null)throw Error('Production preview exited before becoming ready.')
      try {if((await fetch(url)).ok){ready=true;break}}catch { /* Preview is starting. */ }
      await delay(250)
    }
    if(!ready)throw Error('Production preview did not become ready.')
  }
  for(const script of ['browser-check','check-studio-photos','check-2d-mannequin','check-personal','check-functional-audit','check-image-recovery','check-offline-updates','check-3d-quality-resize','check-tailored-avatar','check-responsive-layouts']) {
    console.log(`Browser regression: ${script}`)
    const child=spawn(process.execPath,[`scripts/${script}.mjs`],{stdio:'inherit',env:{...process.env,FIT_PICKER_URL:url}})
    const [code]=await once(child,'exit')
    if(code!==0)throw Error(`${script} failed (exit ${code}).`)
  }
} finally {
  if(server && server.exitCode===null) {
    const closed=once(server,'exit')
    server.kill('SIGTERM')
    await Promise.race([closed,delay(3000)])
    if(server.exitCode===null)server.kill('SIGKILL')
  }
}
