import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowRight, Bookmark, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Coffee, Flower2, Grid2X2, Shirt as Hanger, Heart, Layers3, Leaf, Minus, Plus, RotateCcw, Search, Shirt, Snowflake, Sparkles, Sun, Users, Utensils, X } from 'lucide-react'
import type { Category, Garment, Occasion, Outfit, Season, Selection } from './types'
import { garments, outfits } from './data/wardrobe'
import { recommendOutfits } from './lib/recommendations'
import GarmentArt from './components/GarmentArt'
import OutfitPreview from './components/OutfitPreview'
import SourceGuideCard from './components/SourceGuideCard'
import { sourceGuides as sourceInfo } from './data/source-guides'
import { seasonalOutfits } from './data/seasonal-outfits'

const allOutfits = [...seasonalOutfits, ...outfits]
const seasonIcons = { Autumn: Leaf, Winter: Snowflake, Spring: Flower2, Summer: Sun }
const Mannequin = lazy(() => import('./components/Mannequin'))
const categories: { id: Category; name: string; singular: string }[] = [{ id: 'tops', name: 'Tops', singular: 'Top' }, { id: 'layers', name: 'Layers', singular: 'Layer' }, { id: 'bottoms', name: 'Bottoms', singular: 'Bottom' }, { id: 'shoes', name: 'Shoes', singular: 'Shoes' }]
const seasons: Season[] = ['Autumn', 'Winter', 'Spring', 'Summer']
const occasions: Occasion[] = ['Everyday', 'Dinner', 'Date night', 'With friends', 'Outdoors']
const byId = new Map(garments.map(g => [g.id, g]))
type Page = 'studio' | 'wardrobe' | 'saved'
interface SavedLook { id: string; name: string; items: Selection; saved: string }
const storageKey = 'fit-picker:saved:v1'
function readSaved(): SavedLook[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) || '[]')
    if (!Array.isArray(value)) return []
    return value.filter((v): v is SavedLook => v && typeof v.id === 'string' && typeof v.name === 'string' && v.items && typeof v.items === 'object' && categories.every(c => !v.items[c.id] || byId.has(v.items[c.id])))
  } catch { return [] }
}
function isAvailable(g: Garment, season: Season) { return g.ownership !== 'recommended' && g.seasons.includes(season) }
function sameOutfit(selection: Selection, outfit: Outfit) { return categories.every(c => selection[c.id] === outfit.items[c.id]) }
function FlatLook({ selection }: { selection: Selection }) {
  return <div className="flat-look">{categories.map(c => { const g = byId.get(selection[c.id] || ''); return g ? <div key={c.id}><GarmentArt garment={g}/><small>{g.name}</small></div> : null })}</div>
}

export default function App() {
  const [page, setPage] = useState<Page>('studio')
  const [season, setSeason] = useState<Season>('Autumn')
  const [occasion, setOccasion] = useState<Occasion>('Everyday')
  const [recommendationView, setRecommendationView] = useState<'styled' | 'guide'>('styled')
  const [category, setCategory] = useState<Category>('tops')
  const [selection, setSelection] = useState<Selection>({ ...seasonalOutfits[0].items })
  const [previous, setPrevious] = useState<Selection | null>(null)
  const [rotation, setRotation] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [resetRevision, setResetRevision] = useState(0)
  const [mode, setMode] = useState<'3d' | 'flat'>('3d')
  const [webgl, setWebgl] = useState(true)
  const [saved, setSaved] = useState<SavedLook[]>(readSaved)
  const [search, setSearch] = useState('')
  const [showRecommended, setShowRecommended] = useState(false)
  const [notice, setNotice] = useState('')
  const [modal, setModal] = useState<'save' | 'sources' | 'about' | null>(null)
  const [lookName, setLookName] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  const matched = allOutfits.find(o => sameOutfit(selection, o))
  const chosen = categories.flatMap(c => { const g = byId.get(selection[c.id] || ''); return g ? [g] : [] })
  const complete = !!selection.tops && !!selection.bottoms && !!selection.shoes
  const compatible = recommendOutfits(allOutfits, garments, season, occasion).filter(o => recommendationView === 'styled' ? o.origin === 'styled' : o.origin !== 'styled')
  const garmentList = garments.filter(g => (g.category === category || g.wearableAs?.includes(category)) && (page === 'wardrobe' ? g.seasons.includes(season) : isAvailable(g, season)) && (showRecommended || g.ownership !== 'recommended') && `${g.name} ${g.colorName}`.toLowerCase().includes(search.toLowerCase()))
  const count = garments.filter(g => g.ownership !== 'recommended').length
  useEffect(() => { if (modal && dialog.current && !dialog.current.open) dialog.current.showModal(); if (!modal && dialog.current?.open) dialog.current.close() }, [modal])
  useEffect(() => { if (!notice) return; const id = window.setTimeout(() => setNotice(''), 5000); return () => clearTimeout(id) }, [notice])

  function updateSelection(next: Selection) { setPrevious(selection); setSelection(next) }
  function tryOutfit(outfit: Outfit) { updateSelection({ ...outfit.items }); setPage('studio'); setNotice(`Now trying “${outfit.name}”.`); window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }) }
  function selectGarment(garment: Garment) {
    const next = { ...selection, [category]: garment.id }
    // One physical shirt cannot occupy two slots at the same time.
    categories.forEach(c => { if (c.id !== category && next[c.id] === garment.id) delete next[c.id] })
    updateSelection(next)
    if (page !== 'studio') { setPage('studio'); setNotice(`${garment.name} added to your look.`) }
  }
  function persist(next: SavedLook[]) {
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setSaved(next); return true }
    catch { setNotice('This browser could not save the look. Check available storage and try again.'); return false }
  }
  function saveLook(e: React.FormEvent) {
    e.preventDefault()
    if (!complete || !lookName.trim()) return
    const next = [{ id: crypto.randomUUID(), name: lookName.trim(), items: { ...selection }, saved: new Date().toISOString() }, ...saved]
    if (persist(next)) { setModal(null); setNotice('Look saved to this browser. Find it in Saved looks.') }
  }
  function changeSeason(next: Season) { setSeason(next); setSearch('') }
  function renderOutfitCard(outfit: Outfit, index: number) {
    const label = outfit.origin === 'styled' ? `${outfit.seasons[0].toUpperCase()} · ${outfit.sourceLabel.split(' · ').at(-1)?.toUpperCase()}` : outfit.source === 'ss' ? 'SPRING / SUMMER · GUIDE' : 'AUTUMN / WINTER · GUIDE'
    return <article className="outfit-card" key={outfit.id} data-outfit-id={outfit.id}>
      <div className="outfit-image"><OutfitPreview outfit={outfit}/><span className="look-number">{String(index + 1).padStart(2, '0')}</span><span className="outfit-vibe">{outfit.vibe}</span></div>
      <div className="outfit-content"><span className="eyebrow">{label}</span><h3>{outfit.name}</h3><p>{outfit.subtitle}</p>{outfit.origin === 'styled' && <p className="outfit-reason">{outfit.note}</p>}<div className="look-swatches">{Object.values(outfit.items).map(id => <span key={id} style={{ background: byId.get(id)?.color }} title={byId.get(id)?.name}/>)}</div><button onClick={() => tryOutfit(outfit)}>Try this look <ArrowRight size={15}/></button></div>
    </article>
  }
  const navigation = <>{([{ id: 'studio', name: 'Outfit studio', icon: Hanger }, { id: 'wardrobe', name: 'My wardrobe', icon: Grid2X2 }, { id: 'saved', name: 'Saved looks', icon: Bookmark }] as const).map(nav => <button key={nav.id} onClick={() => { setPage(nav.id); setSearch('') }} className={`nav-item ${page === nav.id ? 'active' : ''}`} aria-current={page === nav.id ? 'page' : undefined}><nav.icon size={19}/><span>{nav.name}</span>{nav.id === 'saved' && saved.length > 0 && <small>{saved.length}</small>}</button>)}</>

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#" onClick={e => { e.preventDefault(); setPage('studio') }}><img src="/icon-192.png" alt=""/><span>fit picker<span className="brand-dot">.</span></span></a>
      <nav aria-label="Main navigation">{navigation}</nav>
      <div className="sidebar-season"><p className="eyebrow">YOUR SEASON</p>{seasons.map(s => { const Icon = seasonIcons[s]; return <button key={s} onClick={() => changeSeason(s)} aria-pressed={season === s} className={season === s ? 'selected' : ''}><Icon size={16}/>{s}{season === s && <span className="small-dot"/>}</button> })}</div>
      <div className="sidebar-bottom"><div className="wardrobe-note"><Layers3 size={22}/><p>Good style starts<br/>with what you own.</p><span>{count} pieces. Endless possibilities.</span></div><button className="source-link" onClick={() => setModal('sources')}><CircleHelp size={16}/> Your wardrobe guides <ArrowRight size={14}/></button><div className="profile"><div className="avatar">K</div><div><strong>Kevin’s wardrobe</strong><small>Your personal edit</small></div><span className="profile-dot"/></div></div>
    </aside>

    <div className="main-shell">
      <header className="topbar"><span className="breadcrumb">Your wardrobe <ChevronRight size={13}/> <strong>{page === 'studio' ? 'Outfit studio' : page === 'wardrobe' ? 'My wardrobe' : 'Saved looks'}</strong></span><span className="topbar-note"><span/> A wardrobe, thoughtfully put together</span><button className="mobile-brand" onClick={() => setPage('studio')}><img src="/icon-192.png" alt=""/>fit picker.</button><button className="help-button" aria-label="About Fit Picker" onClick={() => setModal('about')}><CircleHelp size={19}/></button></header>
      <main>
        <div className="page-heading"><div><div className="eyebrow"><span className="tiny-line"/> YOUR EVERYDAY, WELL DRESSED</div><h1>{page === 'studio' ? <>A good day starts<br className="mobile-break"/> with a good <em>fit.</em></> : page === 'wardrobe' ? <>Your wardrobe, <em>considered.</em></> : <>Good looks, <em>on repeat.</em></>}</h1><p>{page === 'studio' ? 'Rediscover your wardrobe. Put together something that feels like you.' : page === 'wardrobe' ? 'Every piece from your seasonal guides, all in one place.' : 'Your favourite combinations, ready for the next time.'}</p></div><button className="guide-button" onClick={() => setModal('sources')}><Layers3 size={16}/><span>View style guides</span><ArrowRight size={15}/></button></div>

        <div className="context-bar"><div className="occasion-options" aria-label="Occasion">{occasions.map((o, i) => { const Icon = [Coffee, Utensils, Heart, Users, Leaf][i]; return <button className={occasion === o ? 'active' : ''} onClick={() => setOccasion(o)} key={o} aria-pressed={occasion === o}><Icon size={15}/>{o}</button> })}</div><label className="season-select">{(() => { const Icon = seasonIcons[season]; return <Icon size={15}/> })()}<select value={season} onChange={e => changeSeason(e.target.value as Season)} aria-label="Season">{seasons.map(s => <option key={s}>{s}</option>)}</select><ChevronDown size={14}/></label></div>

        {page === 'studio' && <>
          <section className="studio-grid" aria-label="Outfit builder">
            <div className="preview-panel"><div className="preview-top"><span><span className="live-dot"/> THE FIT ROOM</span><div className="mode-toggle"><button className={mode === '3d' ? 'active' : ''} onClick={() => setMode('3d')} aria-pressed={mode === '3d'}>3D view</button><button className={mode === 'flat' ? 'active' : ''} onClick={() => setMode('flat')} aria-pressed={mode === 'flat'}>Flat lay</button></div></div>
              <div className="mannequin-area"><div className="stage-word">YOUR<br/>NEXT<br/><em>FAVOURITE.</em></div>{mode === '3d' && webgl ? <Suspense fallback={<div className="scene-loading"><Hanger size={28}/><span>Opening your fit room…</span></div>}><Mannequin key={resetRevision} garments={garments} selection={selection} rotation={rotation} zoom={zoom} onUnavailable={() => { setWebgl(false); setNotice('3D is unavailable on this device. Your flat outfit view is ready.') }}/></Suspense> : <FlatLook selection={selection}/>}<div className="stage-season">{season.toUpperCase()}<span> / THE PERSONAL EDIT</span></div></div>
              <div className="preview-controls"><span className="drag-hint">{mode === '3d' && webgl ? 'Drag to rotate. Make it yours.' : 'Your pieces, at a glance.'}</span>{mode === '3d' && webgl && <div className="camera-controls"><button aria-label="Rotate left" onClick={() => setRotation(v => v - 30)}><ChevronLeft size={16}/></button><button aria-label="Reset view" onClick={() => { setRotation(0); setZoom(1); setResetRevision(v => v + 1) }}><RotateCcw size={15}/></button><button aria-label="Rotate right" onClick={() => setRotation(v => v + 30)}><ChevronRight size={16}/></button><span/><button aria-label="Zoom out" disabled={zoom <= .8} onClick={() => setZoom(v => Math.max(.8, v - .1))}><Minus size={15}/></button><button aria-label="Zoom in" disabled={zoom >= 1.3} onClick={() => setZoom(v => Math.min(1.3, v + .1))}><Plus size={15}/></button></div>}</div>
              <div className="current-look"><div><span className="eyebrow">ON THE MANNEQUIN</span><h2>{matched?.name || 'Your own combination'}</h2><p>{matched?.origin === 'styled' ? `${matched.seasons[0]} · Styled from your wardrobe` : matched ? `From your ${matched.source === 'ss' ? 'Spring / Summer' : 'Autumn / Winter'} guide` : 'A personal mix of pieces from your wardrobe'}</p></div><button className="save-button" disabled={!complete} onClick={() => { setLookName(matched?.name || 'My everyday look'); setModal('save') }}><Bookmark size={16}/><span>Save look</span></button></div>
            </div>
            <div className="picker-panel"><div className="panel-heading"><div><span className="eyebrow">MAKE IT YOURS</span><h2>Build your look<span>.</span></h2></div><span className="count-pill">{chosen.length} pieces</span></div>
              <div className="category-tabs" role="group" aria-label="Clothing category">{categories.map(c => <button key={c.id} onClick={() => { setCategory(c.id); setSearch('') }} className={category === c.id ? 'active' : ''} aria-pressed={category === c.id}>{c.name}{selection[c.id] && <span/>}</button>)}</div>
              <div className="picker-caption"><span>{garmentList.length} {category === 'layers' ? 'layering pieces' : category} for {season.toLowerCase()}</span>{category === 'layers' ? <button onClick={() => { const next = { ...selection }; delete next.layers; updateSelection(next) }}>No layer <X size={12}/></button> : <Shirt size={15}/>}</div>
              <div className="garment-grid">{garmentList.map(g => <button key={g.id} className={`garment-card ${selection[category] === g.id ? 'selected' : ''}`} onClick={() => selectGarment(g)} aria-pressed={selection[category] === g.id}><div className="garment-picture"><GarmentArt garment={g}/>{selection[category] === g.id && <span className="selected-check"><Check size={12}/></span>}</div><span className="garment-name">{g.name}</span><span className="garment-color"><span style={{ backgroundColor: g.color }}/>{g.colorName}</span></button>)}</div>
              {garmentList.length === 0 && <div className="empty-small">No pieces in this category for {season}. Try another category.</div>}
              <div className="selection-strip"><span className="eyebrow">THE COMBINATION</span><div>{categories.map(c => { const g = byId.get(selection[c.id] || ''); return <span key={c.id} title={g?.name}><span className="selection-color" style={{ background: g?.color || '#e4e4dc' }}/>{g?.name || 'No layer'}</span> })}</div></div>
            </div>
          </section>
          <div className="approximation"><CircleHelp size={13}/><span>A styling preview of your pieces. Shape, graphics and fit are approximate.</span>{previous && <button onClick={() => { setSelection(previous); setPrevious(null); setNotice('Previous outfit restored.') }}>Undo last change</button>}</div>
          <section className="recommendation-section">
            <div className="section-title"><div><span className="eyebrow"><Sparkles size={13}/> YOUR SEASONAL EDIT</span><h2>Right for the <em>occasion.</em></h2><p>{recommendationView === 'styled' ? 'Fresh combinations from the clothes you already own' : 'Combinations preserved from your original guides'}, selected for {occasion.toLowerCase()} in {season.toLowerCase()}.</p></div><span className="outlined-count">{compatible.length} looks</span></div>
            <div className="recommendation-tabs" role="group" aria-label="Outfit collection"><button aria-pressed={recommendationView === 'styled'} onClick={() => setRecommendationView('styled')}><Sparkles size={14}/>New seasonal edit<span>01</span></button><button aria-pressed={recommendationView === 'guide'} onClick={() => setRecommendationView('guide')}><Layers3 size={14}/>From your guides</button></div>
            {recommendationView === 'styled' && <p className="styling-image-note">Generated styling illustrations of your wardrobe combinations. Exact prints, fit and small details may vary.</p>}
            <div className="outfit-grid">{compatible.slice(0, 6).map((o, i) => renderOutfitCard(o, i))}</div>
            {compatible.length === 0 && <div className="empty-state"><Leaf/><h3>No {recommendationView === 'styled' ? 'new' : 'guide'} looks for this combination yet.</h3><p>Try another occasion{recommendationView === 'styled' ? ', explore your guide looks' : ''}, or build your own outfit above.</p>{recommendationView === 'styled' && <button className="primary-button" onClick={() => setRecommendationView('guide')}>Explore guide looks<ArrowRight size={15}/></button>}</div>}
            {compatible.length > 6 && <details className="more-looks" key={`${recommendationView}-${season}-${occasion}`}><summary>Explore {compatible.length - 6} more looks <ArrowDown size={14}/></summary><div className="outfit-grid">{compatible.slice(6).map((o, i) => renderOutfitCard(o, i + 6))}</div></details>}
          </section>
        </>}

        {page === 'wardrobe' && <section className="wardrobe-page"><div className="wardrobe-toolbar"><label className="search"><Search size={17}/><input placeholder="Find a piece or colour…" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search wardrobe"/></label><label className="suggested-toggle"><input type="checkbox" checked={showRecommended} onChange={e => setShowRecommended(e.target.checked)}/> Show suggested pieces</label></div><div className="category-tabs">{categories.map(c => <button key={c.id} onClick={() => setCategory(c.id)} aria-pressed={category === c.id} className={category === c.id ? 'active' : ''}>{c.name}</button>)}</div><div className="wardrobe-full-grid">{garmentList.map(g => <article key={g.id} className="wardrobe-item"><div className="wardrobe-art"><GarmentArt garment={g}/><span className="item-season">{g.ownership === 'recommended' ? 'SUGGESTED · NOT CONFIRMED' : `${g.colorName.toUpperCase()}`}</span></div><h3>{g.name}</h3><p>{g.note || `${g.seasons.join(' / ')} · From your style guides`}</p><button disabled={g.ownership === 'recommended'} onClick={() => selectGarment(g)}>{g.ownership === 'recommended' ? 'Suggested in original guide' : 'Try in studio'}<ArrowRight size={15}/></button></article>)}</div>{!garmentList.length && <div className="empty-state"><Search/><h3>No pieces found.</h3><p>Try a different season, colour or category.</p></div>}</section>}

        {page === 'saved' && <section className="saved-page">{saved.length ? <><p className="saved-explainer">Saved on this browser. These looks stay here when you come back.</p><div className="saved-grid">{saved.map(look => <article className="saved-card" key={look.id}><FlatLook selection={look.items}/><div className="saved-card-content"><h3>{look.name}</h3><p>{Object.values(look.items).filter(Boolean).length} pieces · Your personal combination</p><div><button onClick={() => { updateSelection(look.items); setPage('studio') }}>Wear it again <ArrowRight size={15}/></button><button className="delete-look" aria-label={`Delete ${look.name}`} onClick={() => { if (persist(saved.filter(v => v.id !== look.id))) setNotice('Saved look removed.') }}><X size={17}/></button></div></div></article>)}</div></> : <div className="empty-state saved-empty"><Bookmark size={32}/><h2>Your favourites belong here.</h2><p>Build a look in the studio, then save it for another day.</p><button className="primary-button" onClick={() => setPage('studio')}>Find your next fit <ArrowRight size={16}/></button></div>}</section>}
        <footer className="footer"><span>FIT PICKER <span>/</span> A personal wardrobe, thoughtfully worn.</span><button onClick={() => setModal('about')}>Made for your everyday <ArrowRight size={13}/></button></footer>
      </main>
    </div>
    <nav className="mobile-nav" aria-label="Mobile navigation">{navigation}</nav>
    {notice && <div role="status" className="toast"><Check size={16}/>{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notification"><X size={15}/></button></div>}
    <dialog ref={dialog} className={`modal ${modal === 'sources' ? 'sources-modal' : ''}`} onCancel={() => setModal(null)} onClick={e => { if (e.target === dialog.current) setModal(null) }}><div className="modal-header"><span className="eyebrow">FIT PICKER / YOUR PERSONAL EDIT</span><button onClick={() => setModal(null)} aria-label="Close dialog"><X size={20}/></button></div>
      {modal === 'save' && <form onSubmit={saveLook}><h2>A look worth <em>keeping.</em></h2><p>Give this combination a name. It will be saved on this browser.</p><label className="form-label">Look name<input autoFocus required maxLength={70} value={lookName} onChange={e => setLookName(e.target.value)}/></label><div className="save-preview">{chosen.map(g => <div key={g.id}><GarmentArt garment={g}/><span>{g.name}</span></div>)}</div><button className="primary-button" type="submit">Save this look <Bookmark size={16}/></button></form>}
      {modal === 'sources' && <><h2>It starts with <em>your wardrobe.</em></h2><p>Your wardrobe catalogue and original combinations come from these three images. The new seasonal edit adds fresh combinations using your confirmed pieces. Occasion and season tags are our styling interpretation. Suggested sweatshirts are kept separate from confirmed pieces.</p><div className="source-guides">{Object.entries(sourceInfo).map(([key, source]) => <SourceGuideCard key={key} source={source}/>)}</div></>}
      {modal === 'about' && <><h2>Your clothes.<br/><em>New possibilities.</em></h2><p>Fit Picker is a personal outfit studio built around your three seasonal style guides. Choose an occasion, explore combinations, or make one of your own.</p><p>The 3D mannequin is a stylised colour and silhouette preview. It does not predict sizing, fabric drape or exact prints. Original guide images are available for comparison.</p><p>Saved looks are stored on this device’s browser. The prototype does not sync across devices.</p><button className="primary-button" onClick={() => setModal('sources')}>See the source guides <ArrowRight size={16}/></button></>}
    </dialog>
  </div>
}
