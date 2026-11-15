import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowRight, Bookmark, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Coffee, Flower2, Grid2X2, Shirt as Hanger, Heart, Layers3, Leaf, Minus, Plus, RotateCcw, Search, Shirt, Snowflake, Sparkles, Sun, Users, Utensils, X } from 'lucide-react'
import type { Category, Garment, Occasion, Outfit, Season, Selection } from './types'
import { garments as baseGarments, outfits } from './data/wardrobe'
import { recommendOutfits } from './lib/recommendations'
import GarmentArt from './components/GarmentArt'
import OutfitCanvas from './components/OutfitCanvas'
import OutfitPreview from './components/OutfitPreview'
import WardrobeEditor from './components/WardrobeEditor'
import { personalKey, readPersonal, validatePersonal, validSelection, weatherSuitable, localDay, offlineLook, type Personal } from './lib/personal'
import SourceGuideCard from './components/SourceGuideCard'
import { sourceGuides as sourceInfo } from './data/source-guides'
import { seasonalOutfits } from './data/seasonal-outfits'

const allOutfits = [...seasonalOutfits, ...outfits]
const seasonIcons = { Autumn: Leaf, Winter: Snowflake, Spring: Flower2, Summer: Sun }
function UnavailablePreview({onUnavailable}:{onUnavailable?:()=>void}) {useEffect(()=>{onUnavailable?.()},[onUnavailable]);return <></>}
const Mannequin = lazy(() => import('./components/Mannequin').catch(()=>({default:UnavailablePreview})))
const categories: { id: Category; name: string; singular: string }[] = [{ id: 'tops', name: 'Tops', singular: 'Top' }, { id: 'layers', name: 'Outerwear', singular: 'Outerwear' }, { id: 'bottoms', name: 'Bottoms', singular: 'Bottom' }, { id: 'shoes', name: 'Shoes', singular: 'Shoes' }]
const seasons: Season[] = ['Autumn', 'Winter', 'Spring', 'Summer']
const occasions: Occasion[] = ['Everyday', 'Dinner', 'Date night', 'With friends', 'Outdoors']
type Page = 'studio' | 'wardrobe' | 'saved'
interface SavedLook { id: string; name: string; items: Selection; saved: string }
const storageKey = 'fit-picker:saved:v1'
function sameOutfit(selection: Selection, outfit: Outfit) { return categories.every(c => selection[c.id] === outfit.items[c.id]) }
function LookPieces({ selection, garments }: { selection: Selection; garments: Garment[] }) {
  return <div className="flat-look">{categories.map(c => { const g = garments.find(g => g.id === selection[c.id]); return g ? <div key={c.id}><GarmentArt garment={g}/><small>{g.name}</small></div> : null })}</div>
}

export default function App() {
  const [personal,setPersonal] = useState<Personal>(readPersonal)
  const garments = useMemo(()=>[...baseGarments.map(g => personal.edits.find(e => e.id === g.id) || g), ...personal.edits.filter(g => !baseGarments.some(b => b.id === g.id))],[personal.edits])
  const byId = useMemo(()=>new Map(garments.map(g => [g.id,g])),[garments])
  const [editor,setEditor] = useState<Garment | 'new' | null>(null)
  const [editingLook,setEditingLook] = useState<string | null>(null)
  const [deleted,setDeleted] = useState<SavedLook | null>(null)
  const [pendingImport,setPendingImport] = useState<{personal:Personal;saved:SavedLook[]} | null>(null)
  const [restorePoint,setRestorePoint] = useState<{personal:Personal;saved:SavedLook[]} | null>(null)
  const [online,setOnline] = useState(navigator.onLine)
  useEffect(()=>{const update=()=>setOnline(navigator.onLine);window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update)}},[])
  const [page, setPage] = useState<Page>('studio')
  const [season, setSeason] = useState<Season>(personal.season || 'Autumn')
  const [occasion, setOccasion] = useState<Occasion>(personal.occasion || 'Everyday')
  const [recommendationView, setRecommendationView] = useState<'all' | 'styled' | 'guide'>('all')
  const [wardrobeSeason, setWardrobeSeason] = useState<Season | 'All seasons'>('All seasons')
  const [visibleLooks, setVisibleLooks] = useState(6)
  const [category, setCategory] = useState<Category>('tops')
  const [selection, setSelection] = useState<Selection>(personal.draft && personal.draft.tops && Object.values(personal.draft).every(id => byId.has(id)) ? personal.draft : { ...seasonalOutfits[0].items })
  const [previous, setPrevious] = useState<Selection | null>(null)
  const [rotation, setRotation] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [resetRevision, setResetRevision] = useState(0)
  const [mode, setMode] = useState<'3d' | '2d'>('2d')
  const [webgl, setWebgl] = useState(true)
  const [saved, setSaved] = useState<SavedLook[]>(() => { try { const entries = JSON.parse(localStorage.getItem(storageKey) || '[]'); return Array.isArray(entries) ? entries.filter(v => v && typeof v.id === 'string' && typeof v.name === 'string' && validSelection(v.items) && Object.values(v.items).every(id=>typeof id === 'string' && byId.has(id))) : [] } catch { return [] } })
  const [search, setSearch] = useState('')
  const [showRecommended, setShowRecommended] = useState(false)
  const [notice, setNotice] = useState('')
  const [modal, setModal] = useState<'save' | 'sources' | 'about' | null>(null)
  const [lookName, setLookName] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  const matched = allOutfits.find(o => sameOutfit(selection, o))
  const chosen = categories.flatMap(c => { const g = byId.get(selection[c.id] || ''); return g ? [g] : [] })
  const complete = !!selection.tops && !!selection.bottoms && !!selection.shoes
  const rainyLooks: Outfit[] = personal.rain ? allOutfits.filter(o=>o.items.tops !== 'black-rain-jacket').map(o=>({...o,id:`${o.id}-rain`,name:`${o.name} · rain layer`,subtitle:'With your black rain jacket',items:{...o.items,layers:'black-rain-jacket'},origin:'styled',image:undefined,note:'Rain jacket added over this combination. Check warmth and footwear for your conditions.',sourceLabel:'Personal rain variation'})) : []
  const uniqueRainy = Array.from(new Map(rainyLooks.map(o=>[categories.map(c=>o.items[c.id]||'').join('|'),o])).values())
  const matchingLooks = recommendOutfits(personal.rain ? [...allOutfits,...uniqueRainy] : allOutfits, garments, season, occasion).filter(o =>
    !personal.hidden.includes(o.id) && !Object.values(o.items).some(id => personal.unavailable.includes(id)) && personal.locks.every(slot => o.items[slot] === selection[slot]) && weatherSuitable(Object.values(o.items).map(id => byId.get(id)!).filter(Boolean),personal.temperature,personal.rain,o.items.layers)
  ).sort((a,b) => Number(personal.pinned.includes(b.id))-Number(personal.pinned.includes(a.id)) || personal.history.filter(h=>Date.parse(h.date)>Date.now()-14*86400000&&sameOutfit(h.items,a)).length-personal.history.filter(h=>Date.parse(h.date)>Date.now()-14*86400000&&sameOutfit(h.items,b)).length)
  const compatible = matchingLooks.filter(o => recommendationView === 'all' || (recommendationView === 'styled' ? o.origin === 'styled' : o.origin !== 'styled'))
  const garmentList = garments.filter(g => (g.category === category || g.wearableAs?.includes(category)) && (page !== 'wardrobe' || wardrobeSeason === 'All seasons' || g.seasons.includes(wardrobeSeason)) && ((page === 'wardrobe' && showRecommended) || g.ownership !== 'recommended') && `${g.name} ${g.colorName}`.toLowerCase().includes(search.toLowerCase()))
  const outerwear = garments.filter(g => (g.category === 'layers' || g.wearableAs?.includes('layers')) && g.ownership === 'confirmed')
  useEffect(() => { if (modal && dialog.current && !dialog.current.open) dialog.current.showModal(); if (!modal && dialog.current?.open) dialog.current.close() }, [modal])
  useEffect(() => { if (!notice) return; const id = window.setTimeout(() => setNotice(''), 5000); return () => clearTimeout(id) }, [notice])

  useEffect(() => {
    try { localStorage.setItem(personalKey,JSON.stringify({...personal,draft:selection,season,occasion})) } catch {setNotice('Storage is full. Export a backup and remove some uploaded photos before adding more.')}
  },[personal,selection,season,occasion])
  useEffect(() => { const handler=(event:MessageEvent)=>{if(event.data?.type==='LOOK_CACHED')setNotice(event.data.success?'Outfit photos saved for offline use.':'Some photos could not be cached. Reconnect and try again.')};navigator.serviceWorker?.addEventListener('message',handler);return()=>navigator.serviceWorker?.removeEventListener('message',handler)},[])
  function toggle(field: 'unavailable'|'pinned'|'hidden',id:string) {setPersonal(p=>({...p,[field]:p[field].includes(id)?p[field].filter(v=>v!==id):[...p[field],id]}))}
  function wearToday() {setPersonal(p=>({...p,history:[{date:localDay(),items:{...selection}},...p.history.filter(h=>!(h.date===localDay()&&JSON.stringify(h.items)===JSON.stringify(selection)))].slice(0,2000)}));setNotice('Added to your wear history.')}
  function exportData() {const blob=new Blob([JSON.stringify({version:1,personal:{...personal,draft:selection,season,occasion},saved},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`fit-picker-${localDay()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  async function importData(file?:File) {if(!file)return;setPendingImport(null);try{if(file.size>4500000)throw Error('Backup must be under 4.5 MB.');const data=JSON.parse(await file.text());if(data.version!==1)throw Error('Unsupported backup version.');const prefs=validatePersonal(data.personal);const lookup=new Map([...baseGarments,...prefs.edits].map(g=>[g.id,g]));const ids=new Set(lookup.keys());const fits=(items:Selection)=>categories.every(c=>!items[c.id]||lookup.get(items[c.id]!)?.category===c.id||lookup.get(items[c.id]!)?.wearableAs?.includes(c.id));if([prefs.draft,...prefs.history.map(h=>h.items)].some(items=>items&&(!fits(items)||Object.values(items).some(id=>!ids.has(id)))))throw Error('Unknown garment or invalid clothing slot in backup.');if(!Array.isArray(data.saved)||data.saved.length>1000||data.saved.some((v:SavedLook)=>!v||typeof v.id!=='string'||typeof v.name!=='string'||v.name.length>100||!validSelection(v.items)||!fits(v.items)||Object.values(v.items).some(id=>!ids.has(id))))throw Error('Invalid saved looks.');setPendingImport({personal:prefs,saved:data.saved})}catch(e){setNotice((e as Error).message)}}
  function restore(data:{personal:Personal;saved:SavedLook[]}) {
    const oldPersonal=localStorage.getItem(personalKey),oldSaved=localStorage.getItem(storageKey)
    try {localStorage.setItem(personalKey,JSON.stringify(data.personal));localStorage.setItem(storageKey,JSON.stringify(data.saved))}
    catch {try{if(oldPersonal===null)localStorage.removeItem(personalKey);else localStorage.setItem(personalKey,oldPersonal);if(oldSaved===null)localStorage.removeItem(storageKey);else localStorage.setItem(storageKey,oldSaved)}catch{}setNotice('Not enough storage to restore this backup. Your existing data was retained.');return}
    setSaved(data.saved);setPersonal(data.personal);setSelection(data.personal.draft || {...seasonalOutfits[0].items});setSeason(data.personal.season || 'Autumn');setOccasion(data.personal.occasion || 'Everyday');setPendingImport(null);setNotice('Backup restored.')
  }
  function cacheLook(items:Selection) {if(!('serviceWorker' in navigator)){setNotice('Offline storage is unavailable in this browser.');return}setNotice('Saving outfit photos for offline use…');offlineLook(items,garments)?.catch(()=>setNotice('Offline storage is unavailable. Try again when connected.'))}
  function updateSelection(next: Selection) { setPrevious(selection); setSelection(next) }
  function tryOutfit(outfit: Outfit) { updateSelection({ ...outfit.items, ...Object.fromEntries(personal.locks.map(slot=>[slot,selection[slot]])) }); setEditingLook(null); setPage('studio'); setNotice(`Now trying “${outfit.name}”.`); window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }) }
  function selectGarment(garment: Garment, slot: Category = category) {
    setSearch('')
    const next = { ...selection, [slot]: garment.id }
    // One physical shirt cannot occupy two slots at the same time.
    categories.forEach(c => { if (c.id !== slot && next[c.id] === garment.id) delete next[c.id] })
    updateSelection(next)
    if (page !== 'studio') { setPage('studio'); setNotice(`${garment.name} added to your look.`) }
  }
  function removeOuterwear() { const next = { ...selection }; delete next.layers; updateSelection(next) }
  function persist(next: SavedLook[]) {
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setSaved(next); return true }
    catch { setNotice('This browser could not save the look. Check available storage and try again.'); return false }
  }
  function saveLook(e: React.FormEvent) {
    e.preventDefault()
    if (!complete || !lookName.trim()) return
    const duplicate = saved.find(v=>categories.every(c=>v.items[c.id]===selection[c.id])); const id=editingLook || duplicate?.id || crypto.randomUUID()
    const next = [{ id, name: lookName.trim(), items: { ...selection }, saved: new Date().toISOString() }, ...saved.filter(v=>v.id!==id)]
    if (persist(next)) { setModal(null); setEditingLook(null); setNotice('Look saved to this browser. Find it in Saved looks.') }
  }
  function changeSeason(next: Season) { setSeason(next) }
  useEffect(() => { setVisibleLooks(6) }, [season, occasion, recommendationView])
  function renderOutfitCard(outfit: Outfit, index: number) {
    const label = outfit.origin === 'styled' ? `${outfit.seasons[0].toUpperCase()} · ${outfit.sourceLabel.split(' · ').at(-1)?.toUpperCase()}` : outfit.source === 'ss' ? 'SPRING / SUMMER · GUIDE' : 'AUTUMN / WINTER · GUIDE'
    return <article className="outfit-card" key={outfit.id} data-outfit-id={outfit.id}>
      <div className="outfit-image"><OutfitPreview outfit={outfit} garments={garments}/><span className="look-number">{String(index + 1).padStart(2, '0')}</span><span className="outfit-vibe">{outfit.vibe}</span></div>
      <div className="outfit-content"><span className="eyebrow">{label}</span><h3>{outfit.name}</h3><p>{outfit.subtitle}</p>{outfit.origin === 'styled' && <p className="outfit-reason">{outfit.note}</p>}<div className="look-swatches">{Object.values(outfit.items).map(id => <span key={id} style={{ background: byId.get(id)?.color }} title={byId.get(id)?.name}/>)}</div><button onClick={() => tryOutfit(outfit)}>Try this look <ArrowRight size={15}/></button><div className="look-actions"><button aria-pressed={personal.pinned.includes(outfit.id)} onClick={()=>toggle('pinned',outfit.id)}>Favourite</button><button onClick={()=>toggle('hidden',outfit.id)}>Hide suggestion</button></div></div>
    </article>
  }
  const navigation = <>{([{ id: 'studio', name: 'Outfit studio', icon: Hanger }, { id: 'wardrobe', name: 'My wardrobe', icon: Grid2X2 }, { id: 'saved', name: 'Saved looks', icon: Bookmark }] as const).map(nav => <button key={nav.id} aria-label={nav.name} title={nav.name} onClick={() => { setPage(nav.id); setSearch('') }} className={`nav-item ${page === nav.id ? 'active' : ''}`} aria-current={page === nav.id ? 'page' : undefined}><nav.icon size={19}/><span>{nav.name}</span>{nav.id === 'saved' && saved.length > 0 && <small>{saved.length}</small>}</button>)}</>

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#" onClick={e => { e.preventDefault(); setPage('studio') }}><img src="/icon-192.png" alt=""/><span>fit picker<span className="brand-dot">.</span></span></a>
      <nav aria-label="Main navigation">{navigation}</nav>
      <div className="sidebar-inspiration"><p className="eyebrow">FIND YOUR NEXT LOOK</p><button onClick={() => { setPage('studio'); requestAnimationFrame(() => document.querySelector('.recommendation-section')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })) }}><Sparkles size={16}/>Outfit inspiration<ArrowRight size={13}/></button></div>
      <div className="sidebar-bottom"><button className="source-link" onClick={() => setModal('sources')}><CircleHelp size={16}/> Your wardrobe guides <ArrowRight size={14}/></button><div className="profile"><div className="avatar">K</div><div><strong>Kevin’s wardrobe</strong><small>Your personal edit</small></div><span className="profile-dot"/></div></div>
    </aside>

    <div className="main-shell">
      <header className="topbar"><span className="breadcrumb">Your wardrobe <ChevronRight size={13}/> <strong>{page === 'studio' ? 'Outfit studio' : page === 'wardrobe' ? 'My wardrobe' : 'Saved looks'}</strong></span><span className="topbar-note"><span/> A wardrobe, thoughtfully put together</span><button className="mobile-brand" onClick={() => setPage('studio')}><img src="/icon-192.png" alt=""/>fit picker.</button><button className="help-button" aria-label="About Fit Picker" onClick={() => setModal('about')}><CircleHelp size={19}/></button></header>
      <main>
        <div className="page-heading"><div><div className="eyebrow"><span className="tiny-line"/> YOUR EVERYDAY, WELL DRESSED</div><h1>{page === 'studio' ? <>A good day starts<br className="mobile-break"/> with a good <em>fit.</em></> : page === 'wardrobe' ? <>Your wardrobe, <em>considered.</em></> : <>Good looks, <em>on repeat.</em></>}</h1>{page !== 'studio' && <p>{page === 'wardrobe' ? 'Every piece from your seasonal guides, all in one place.' : 'Your favourite combinations, ready for the next time.'}</p>}</div><button className="guide-button" aria-label="View style guides" title="View style guides" onClick={() => setModal('sources')}><Layers3 size={16}/><span>View style guides</span><ArrowRight size={15}/></button></div>



        {page === 'studio' && <>
          <section className="studio-grid" aria-label="Outfit builder">
            <div className="preview-panel"><div className="preview-top"><span><span className="live-dot"/> THE FIT ROOM</span><div className="mode-toggle"><button className={mode === '2d' ? 'active' : ''} onClick={() => setMode('2d')} aria-pressed={mode === '2d'}>2D outfit</button><button className={mode === '3d' ? 'active' : ''} disabled={!webgl || !online} title={!online ? 'Connect to open 3D' : undefined} onClick={() => setMode('3d')} aria-pressed={mode === '3d'}>3D preview</button></div></div>
              <div className="mannequin-area">{mode === '3d' && webgl ? <Suspense fallback={<div className="scene-loading"><Hanger size={28}/><span>Opening your fit room…</span></div>}><Mannequin key={resetRevision} garments={garments} selection={selection} rotation={rotation} zoom={zoom} onUnavailable={() => { setWebgl(false); setMode('2d'); setNotice('The 3D preview could not load. Your 2D outfit is ready.') }}/></Suspense> : <OutfitCanvas selection={selection} garments={garments}/>}{mode === '3d' && <div className="stage-season">YOUR SELECTED PIECES<span> / FITTING PREVIEW</span></div>}</div>
              <div className="preview-controls"><span className="drag-hint">{mode === '3d' && webgl ? 'Drag to rotate. Make it yours.' : 'Your chosen pieces, styled together.'}</span>{mode === '3d' && webgl && <div className="camera-controls"><button aria-label="Rotate left" onClick={() => setRotation(v => v - 30)}><ChevronLeft size={16}/></button><button aria-label="Reset view" onClick={() => { setRotation(0); setZoom(1); setResetRevision(v => v + 1) }}><RotateCcw size={15}/></button><button aria-label="Rotate right" onClick={() => setRotation(v => v + 30)}><ChevronRight size={16}/></button><span/><button aria-label="Zoom out" disabled={zoom <= .8} onClick={() => setZoom(v => Math.max(.8, v - .1))}><Minus size={15}/></button><button aria-label="Zoom in" disabled={zoom >= 1.3} onClick={() => setZoom(v => Math.min(1.3, v + .1))}><Plus size={15}/></button></div>}</div>
              <div className="current-look"><div><span className="eyebrow">YOUR CURRENT OUTFIT</span><h2>{matched?.name || 'Your own combination'}</h2><p>{matched?.origin === 'styled' ? `${matched.seasons[0]} · Styled from your wardrobe` : matched ? `From your ${matched.source === 'ss' ? 'Spring / Summer' : 'Autumn / Winter'} guide` : 'A personal mix of pieces from your wardrobe'}</p></div><button className="save-button" disabled={!complete} onClick={() => { setLookName(editingLook ? saved.find(l=>l.id===editingLook)?.name || lookName : matched?.name || 'My everyday look'); setModal('save') }}><Bookmark size={16}/><span>{editingLook ? 'Update look' : 'Save look'}</span></button></div>
            </div>
            <div className="picker-panel"><div className="panel-heading"><div><span className="eyebrow">MAKE IT YOURS</span><h2>Build your look<span>.</span></h2></div><span className="count-pill">{chosen.length} pieces</span></div>
              <label className="outerwear-control"><span>Outerwear</span><span className="select-control"><select aria-label="Selected outerwear" value={selection.layers || ''} onChange={e => { const garment = byId.get(e.target.value); if (garment) selectGarment(garment, 'layers'); else removeOuterwear() }}><option value="">No outerwear</option>{outerwear.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select><ChevronDown size={15} aria-hidden="true"/></span></label>
              <div className="category-tabs" role="group" aria-label="Clothing category">{categories.map(c => <button key={c.id} onClick={() => { setCategory(c.id); setSearch('') }} className={category === c.id ? 'active' : ''} aria-pressed={category === c.id}>{c.name}{selection[c.id] && <span/>}</button>)}</div>
              <div className="picker-caption"><span>{garmentList.length} {category === 'layers' ? 'outerwear pieces' : category} in your wardrobe</span>{category === 'layers' ? <button onClick={removeOuterwear} disabled={!selection.layers}>Remove outerwear <X size={12}/></button> : <Shirt size={15}/>}</div>
              <div className="garment-grid">{garmentList.map(g => <button key={g.id} data-garment-id={g.id} className={`garment-card ${selection[category] === g.id ? 'selected' : ''}`} onClick={() => selectGarment(g)} aria-pressed={selection[category] === g.id}><div className="garment-picture"><GarmentArt garment={g}/>{selection[category] === g.id && <span className="selected-check"><Check size={12}/></span>}</div><span className="garment-name">{g.name}</span><span className="garment-color"><span style={{ backgroundColor: g.color }}/>{g.colorName}</span></button>)}</div>
              {garmentList.length === 0 && <div className="empty-small">No confirmed pieces in this category. Try another category.</div>}
              <div className="selection-strip"><span className="eyebrow">THE COMBINATION</span><div>{categories.map(c => { const g = byId.get(selection[c.id] || ''); return <span key={c.id} title={g?.name}><span className="selection-color" style={{ background: g?.color || '#e4e4dc' }}/>{g?.name || 'No outerwear'}</span> })}</div></div>
            </div>
          </section>
          <div className="personal-bar">{editingLook&&<><span>Editing {saved.find(l=>l.id===editingLook)?.name}</span><button onClick={()=>setEditingLook(null)}>Cancel editing</button></>}{!online&&<span className="offline-status">Offline · Your cached outfits are available in 2D.</span>}<button onClick={wearToday} disabled={!complete}>Wore this today</button><button onClick={()=>cacheLook(selection)}>Keep outfit offline</button>{personal.history[0]&&<span className="history-entry">Last recorded: {personal.history[0].date}</span>}</div><div className="approximation"><CircleHelp size={13}/><span>Product images and 3D silhouettes are illustrative. Exact cuts, prints and fit may vary.</span>{previous && <button onClick={() => { setSelection(previous); setPrevious(null); setNotice('Previous outfit restored.') }}>Undo last change</button>}</div>
          <section className="recommendation-section">
            <div className="section-title"><div><span className="eyebrow"><Sparkles size={13}/> YOUR SEASONAL EDIT</span><h2>Right for the <em>occasion.</em></h2><p>{recommendationView === 'guide' ? 'Combinations preserved from your original guides' : 'Outfit ideas from the clothes you already own'}, selected for {occasion.toLowerCase()} in {season.toLowerCase()}.</p></div><span className="outlined-count">{compatible.length} looks</span></div>
        <div className="context-bar" role="group" aria-label="Outfit recommendation filters"><div className="occasion-options" aria-label="Occasion">{occasions.map((o, i) => { const Icon = [Coffee, Utensils, Heart, Users, Leaf][i]; return <button className={occasion === o ? 'active' : ''} onClick={() => setOccasion(o)} key={o} aria-pressed={occasion === o}><Icon size={15}/>{o}</button> })}</div><label className="season-select">{(() => { const Icon = seasonIcons[season]; return <Icon size={15}/> })()}<select value={season} onChange={e => changeSeason(e.target.value as Season)} aria-label="Season">{seasons.map(s => <option key={s}>{s}</option>)}</select><ChevronDown size={14}/></label></div>
            <div className="lock-controls" aria-label="Keep selected pieces">{categories.map(c=><button key={c.id} disabled={!selection[c.id] && !personal.locks.includes(c.id)} aria-pressed={personal.locks.includes(c.id)} onClick={()=>{setPersonal(p=>({...p,locks:p.locks.includes(c.id)?p.locks.filter(v=>v!==c.id):[...p.locks,c.id]}));setVisibleLooks(6)}}>{personal.locks.includes(c.id)?'Locked':'Lock'} {c.name}</button>)}</div><div className="weather-controls"><label>Temperature °C<input aria-label="Temperature °C" type="number" min="-30" max="50" placeholder="Any" value={personal.temperature} onChange={e=>{setPersonal(p=>({...p,temperature:e.target.value === '' ? '' : String(Math.max(-30,Math.min(50,Number(e.target.value))))}));setVisibleLooks(6)}}/></label><label><input type="checkbox" checked={personal.rain} onChange={e=>{setPersonal(p=>({...p,rain:e.target.checked}));setVisibleLooks(6)}}/>Rain — require rain-suitable outerwear</label></div><p className="history-entry">Weather matching uses your item settings and broad warmth rules. Check conditions and your own comfort.</p>{!!personal.hidden.length&&<button onClick={()=>setPersonal(p=>({...p,hidden:[]}))}>Restore hidden suggestions ({personal.hidden.length})</button>}<p className="recommendation-filter-note">Filter the outfit ideas below. Choose “Try this look” to change your current outfit.</p>
            <div className="recommendation-tabs" role="group" aria-label="Outfit collection"><button aria-pressed={recommendationView === 'all'} onClick={() => setRecommendationView('all')}>All looks<span className="collection-count">{matchingLooks.length}</span></button><button aria-pressed={recommendationView === 'styled'} onClick={() => setRecommendationView('styled')}><Sparkles size={14}/>Seasonal edits<span>01 + 02</span></button><button aria-pressed={recommendationView === 'guide'} onClick={() => setRecommendationView('guide')}><Layers3 size={14}/>From your guides</button></div>
            <p className="styling-image-note">Model photos illustrate your wardrobe combinations. Exact prints, cuts and fit may vary.</p>
            <div className="outfit-grid">{compatible.slice(0, visibleLooks).map((o, i) => renderOutfitCard(o, i))}</div>
            {compatible.length === 0 && <div className="empty-state"><Leaf/><h3>No {recommendationView === 'styled' ? 'new' : 'guide'} looks for this combination yet.</h3><p>Try another occasion, unlock a piece, or clear weather filters{recommendationView === 'styled' ? ', explore your guide looks' : ''}, or build your own outfit above.</p>{recommendationView === 'styled' && <button className="primary-button" onClick={() => setRecommendationView('guide')}>Explore guide looks<ArrowRight size={15}/></button>}</div>}
            {compatible.length > visibleLooks && <button className="show-more-looks" onClick={() => setVisibleLooks(count => count + 6)}>Show {Math.min(6, compatible.length - visibleLooks)} more looks <ArrowDown size={14}/><span>({compatible.length - visibleLooks} remaining)</span></button>}
          </section>
        </>}

        {page === 'wardrobe' && <section className="wardrobe-page"><div className="personal-bar"><button onClick={()=>setEditor('new')}>Add garment</button></div><div className="wardrobe-toolbar"><label className="search"><Search size={17}/><input placeholder="Find a piece or colour…" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search wardrobe"/></label><label className="wardrobe-season-filter">Season<span className="select-control"><select aria-label="Wardrobe season" value={wardrobeSeason} onChange={e => setWardrobeSeason(e.target.value as Season | 'All seasons')}><option>All seasons</option>{seasons.map(value => <option key={value}>{value}</option>)}</select><ChevronDown size={14} aria-hidden="true"/></span></label><label className="suggested-toggle"><input type="checkbox" checked={showRecommended} onChange={e => setShowRecommended(e.target.checked)}/> Show suggested pieces</label></div><div className="category-tabs">{categories.map(c => <button key={c.id} onClick={() => setCategory(c.id)} aria-pressed={category === c.id} className={category === c.id ? 'active' : ''}>{c.name}</button>)}</div><div className="wardrobe-full-grid">{garmentList.map(g => <article key={g.id} className="wardrobe-item"><div className="wardrobe-art"><GarmentArt garment={g}/><span className="item-season">{g.ownership === 'recommended' ? 'SUGGESTED · NOT CONFIRMED' : `${g.colorName.toUpperCase()}`}</span></div><h3>{g.name}</h3>{personal.unavailable.includes(g.id)&&<p className="availability">Unavailable / in laundry</p>}<div className="item-actions"><button onClick={()=>setEditor(g)}>Edit piece</button><button aria-pressed={personal.unavailable.includes(g.id)} onClick={()=>toggle('unavailable',g.id)}>{personal.unavailable.includes(g.id)?'Mark available':'In laundry / unavailable'}</button></div><p>{g.note || `${g.seasons.join(' / ')} · From your style guides`}</p><button disabled={g.ownership === 'recommended'} onClick={() => selectGarment(g)}>{g.ownership === 'recommended' ? 'Suggested in original guide' : 'Try in studio'}<ArrowRight size={15}/></button></article>)}</div>{!garmentList.length && <div className="empty-state"><Search/><h3>No pieces found.</h3><p>Try a different season, colour or category.</p></div>}</section>}

        {page === 'saved' && <section className="saved-page"><div className="personal-bar"><button onClick={exportData}>Export backup</button><label>Import backup<input aria-label="Import backup" type="file" accept="application/json,.json" onChange={e=>{importData(e.target.files?.[0]);e.target.value=''}}/></label>{deleted&&<button onClick={()=>{persist([deleted,...saved.filter(l=>l.id!==deleted.id)]);setDeleted(null)}}>Undo delete</button>}{restorePoint&&<button onClick={()=>{restore(restorePoint);setRestorePoint(null)}}>Undo restore</button>}</div>{pendingImport&&<div className="backup-preview" role="status"><p>Restore {pendingImport.saved.length} saved looks and {pendingImport.personal.edits.length} garment edits? This replaces the data in this browser.</p><button onClick={()=>{setRestorePoint({personal:{...personal,draft:selection,season,occasion},saved});restore(pendingImport)}}>Replace with this backup</button><button onClick={()=>setPendingImport(null)}>Cancel import</button></div>}{!!personal.history.length&&<details><summary>Wear history ({personal.history.length})</summary>{personal.history.slice(0,30).map((h,i)=><p className="history-entry" key={i}>{h.date} · {Object.values(h.items).map(id=>byId.get(id)?.name).filter(Boolean).join(' + ')} <button onClick={()=>setPersonal(p=>({...p,history:p.history.filter((_,n)=>n!==i)}))}>Remove entry</button></p>)}</details>}{saved.length ? <><p className="saved-explainer">Saved on this browser. These looks stay here when you come back.</p><div className="saved-grid">{saved.map(look => <article className="saved-card" key={look.id}><LookPieces selection={look.items} garments={garments}/><div className="saved-card-content"><h3>{look.name}</h3><div className="look-actions"><button onClick={()=>{updateSelection(look.items);setEditingLook(look.id);setLookName(look.name);setModal('save')}}>Edit saved look</button><button onClick={()=>cacheLook(look.items)}>Keep offline</button></div><p>{Object.values(look.items).filter(Boolean).length} pieces · Your personal combination</p><div><button onClick={() => { setEditingLook(null); updateSelection(look.items); setPage('studio') }}>Wear it again <ArrowRight size={15}/></button><button className="delete-look" aria-label={`Delete ${look.name}`} onClick={() => { if (persist(saved.filter(v => v.id !== look.id))) {setDeleted(look);setNotice('Saved look removed. Use Undo delete to restore it.')} }}><X size={17}/></button></div></div></article>)}</div></> : <div className="empty-state saved-empty"><Bookmark size={32}/><h2>Your favourites belong here.</h2><p>Build a look in the studio, then save it for another day.</p><button className="primary-button" onClick={() => setPage('studio')}>Find your next fit <ArrowRight size={16}/></button></div>}</section>}
        <footer className="footer"><span>FIT PICKER <span>/</span> A personal wardrobe, thoughtfully worn.</span><button onClick={() => setModal('about')}>Made for your everyday <ArrowRight size={13}/></button></footer>
      </main>
    </div>
    <nav className="mobile-nav" aria-label="Mobile navigation">{navigation}</nav>
    {editor&&<WardrobeEditor garment={editor==='new'?undefined:editor} onClose={()=>setEditor(null)} onSave={g=>{try{const next={...personal,edits:[...personal.edits.filter(v=>v.id!==g.id),g]};validatePersonal(next);localStorage.setItem(personalKey,JSON.stringify({...next,draft:selection,season,occasion}));setPersonal(next);setCategory(g.category);setSearch('');setEditor(null);setNotice('Garment saved.')}catch(e){setNotice((e as Error).message)}}}/>}
    {notice && <div role="status" className="toast"><Check size={16}/>{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notification"><X size={15}/></button></div>}
    <dialog ref={dialog} className={`modal ${modal === 'sources' ? 'sources-modal' : ''}`} onCancel={() => setModal(null)} onClick={e => { if (e.target === dialog.current) setModal(null) }}><div className="modal-header"><span className="eyebrow">FIT PICKER / YOUR PERSONAL EDIT</span><button onClick={() => setModal(null)} aria-label="Close dialog"><X size={20}/></button></div>
      {modal === 'save' && <form onSubmit={saveLook}><h2>A look worth <em>keeping.</em></h2><p>Give this combination a name. It will be saved on this browser.</p><label className="form-label">Look name<input autoFocus required maxLength={70} value={lookName} onChange={e => setLookName(e.target.value)}/></label><div className="save-preview">{chosen.map(g => <div key={g.id}><GarmentArt garment={g}/><span>{g.name}</span></div>)}</div><button type="button" onClick={()=>{setModal(null);setPage('studio')}}>Change pieces</button><button className="primary-button" type="submit">Save this look <Bookmark size={16}/></button></form>}
      {modal === 'sources' && <><h2>It starts with <em>your wardrobe.</em></h2><p>Your wardrobe catalogue and original combinations come from these three images. The new seasonal edit adds fresh combinations using your confirmed pieces. Occasion and season tags are our styling interpretation. Suggested sweatshirts are kept separate from confirmed pieces.</p><div className="source-guides">{Object.entries(sourceInfo).map(([key, source]) => <SourceGuideCard key={key} source={source}/>)}</div></>}
      {modal === 'about' && <><h2>Your clothes.<br/><em>New possibilities.</em></h2><p>Fit Picker is a personal outfit studio built around your three seasonal style guides. Choose an occasion, explore combinations, or make one of your own.</p><p>The 2D outfit uses realistic garment cutouts to show your selected combination. These are generated representations, rather than photographs of your exact items. The 3D fitting preview uses a generic body and fitted garment templates; neither view predicts sizing or fabric fit.</p><p>Saved looks are stored on this device’s browser. The prototype does not sync across devices.</p><button className="primary-button" onClick={() => setModal('sources')}>See the source guides <ArrowRight size={16}/></button></>}
    </dialog>
  </div>
}
