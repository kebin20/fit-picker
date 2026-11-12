import type { Garment } from '../types'

/** Small, code-native garment illustrations; colours/styles come from the source catalogue. */
export default function GarmentArt({ garment, className = '' }: { garment: Garment; className?: string }) {
  const color = garment.color
  const long = ['longsleeve', 'shirt', 'sweatshirt', 'hoodie', 'overshirt', 'bomber', 'coat', 'puffer', 'raincoat'].includes(garment.style) && !(garment.style === 'shirt' && (garment.name.includes('short-sleeve') || garment.source === 'ss'))
  const shirt = ['shirt', 'overshirt', 'coat', 'bomber', 'raincoat', 'puffer'].includes(garment.style)
  const uid = `pattern-${garment.id}`
  return <svg className={`garment-art ${className}`} viewBox="0 0 120 120" aria-hidden="true">
    <defs>
      <linearGradient id={`shade-${garment.id}`} x1="0" x2="1"><stop stopColor="#fff" stopOpacity=".13"/><stop offset=".55" stopColor="#fff" stopOpacity="0"/><stop offset="1" stopColor="#000" stopOpacity=".14"/></linearGradient>
      <pattern id={uid} width="13" height="13" patternUnits="userSpaceOnUse"><path d="M3 0v13M0 4h13M8 0v13M0 10h13" stroke="#231d17" strokeWidth="1" opacity=".4"/></pattern>
    </defs>
    <ellipse cx="60" cy="107" rx="35" ry="3" fill="#342d22" opacity=".07"/>
    {garment.category === 'bottoms' ? <g>
      <path d={garment.style === 'shorts' ? 'M31 20h58l7 63-29 2-7-37-7 37-29-2z' : 'M33 13h54l5 91-27 1-5-62-5 62-27-1z'} fill={color} stroke="#28251f" strokeOpacity=".16"/>
      <path d="M35 23h49M60 23v22M42 24l-5 20M78 24l5 20" fill="none" stroke="#000" strokeOpacity=".18"/>
      <path d={garment.style === 'shorts' ? 'M42 43l-3 34M77 43l4 34' : 'M43 44l-3 51M77 44l4 51'} stroke="#fff" strokeOpacity=".16"/>
    </g> : garment.category === 'shoes' ? <g transform="translate(0 8)">
      <path d="M24 48l20-12 17 15 11 12 30 7c9 3 10 18 0 21H20c-9-1-10-10-6-19z" fill={color} stroke="#272a25" strokeOpacity=".2"/>
      <path d="M14 82c22 6 62 7 94 1v8H14z" fill={garment.colorName.toLowerCase().includes('black') && garment.style !== 'canvas' ? '#3a3c39' : '#edece6'}/>
      <path d="M45 51l18 8m-22-1 19 9m-23-2 19 9" stroke="#e4e2d7" strokeWidth="3" strokeLinecap="round"/>
      {garment.pattern === 'stripes' && <path d="M66 62l-9 17m19-13-8 16m19-12-7 13" stroke="#1f2524" strokeWidth="5"/>}
      {garment.style === 'canvas' && <path d="M84 69c16-2 25 6 22 13H77z" fill="#f4f1e9"/>}
    </g> : <g>
      <path d={long ? `M42 17l-17 9-17 58 17 6 14-39-2 ${garment.style === 'coat' ? '52' : '42'}h46l-2-${garment.style === 'coat' ? '52' : '42'} 14 39 17-6-17-58-17-9z` : 'M42 22l-18 6-16 25 18 12 12-16v48h44V49l12 16 18-12-16-25-18-6z'} fill={color} stroke="#28251f" strokeOpacity=".18"/>
      {garment.pattern === 'check' && <path d="M42 17l-17 9-17 58 17 6 14-39-2 42h46l-2-42 14 39 17-6-17-58-17-9z" fill={`url(#${uid})`}/>}
      <path d="M42 22q18 22 36 0" stroke="#000" strokeOpacity=".2" strokeWidth="3" fill="none"/>
      {shirt && <><path d="M60 36v57M43 19l17 17-12 5-7-17m36-5L60 36l12 5 7-17" stroke="#000" strokeOpacity=".22" fill="none"/><path d="M65 49v36" stroke="#efe9d8" strokeWidth="2" strokeDasharray="1 10"/></>}
      {garment.style === 'hoodie' && <><path d="M43 21q-1-19 17-18t17 18L65 33H55z" fill={color} stroke="#000" strokeOpacity=".18"/><path d="M49 71h22l6 14H43z" fill="#000" opacity=".08"/></>}
      {garment.style === 'puffer' && <path d="M38 44h44M38 57h44M38 70h44M38 83h44" stroke="#000" strokeOpacity=".2" strokeWidth="2"/>}
      {garment.pattern === 'graphic' && <><rect x="46" y="43" width="28" height="29" rx="2" fill="#dfd6bb" opacity=".6"/><path d="M51 64l6-10 4 5 7-13v20z" fill="#303d3c" opacity=".7"/></>}
      <path d="M38 89h44" stroke="#000" strokeOpacity=".08"/>
    </g>}
  </svg>
}
