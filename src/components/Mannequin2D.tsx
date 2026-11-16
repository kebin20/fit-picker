import { useId } from 'react'

/** A small vector display form. Clothing stays photographic; no WebGL is used. */
export default function Mannequin2D({ back, longSleeves, coat, bareFeet, dressed }: { back: boolean; longSleeves: boolean; coat: boolean; bareFeet: boolean; dressed: boolean }) {
  const id = useId().replace(/:/g, '')
  const surface = `${id}-surface`, head = `${id}-head`
  return <svg className="outfit-mannequin" viewBox="0 0 300 560" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={surface} x1="0" x2="1"><stop stopColor="#c6c3b7"/><stop offset=".25" stopColor="#edeae0"/><stop offset=".58" stopColor="#e3dfd2"/><stop offset="1" stopColor="#bcb9ad"/></linearGradient>
      <radialGradient id={head} cx=".36" cy=".3" r=".8"><stop stopColor="#f4f0e7"/><stop offset=".65" stopColor="#dfdace"/><stop offset="1" stopColor="#b9b7ab"/></radialGradient>
      <clipPath id={`${id}-clothed`}><rect x="0" y="125" width="300" height="435"/></clipPath>
    </defs>
    <ellipse cx="150" cy="551" rx="74" ry="6" fill="#34422a" opacity=".09"/>
    <g fill={`url(#${surface})`} stroke="#aaa99d" strokeWidth=".6">
      <path d="M139 66 Q150 73 161 66 L163 91 178 98 122 98 137 91Z"/>
      <path clipPath={dressed ? `url(#${id}-clothed)` : undefined} d="M121 94 Q150 87 179 94 Q198 101 199 119 L185 187 Q181 220 190 255 Q199 280 190 308 L162 322 150 303 138 322 110 308 Q101 280 110 255 Q119 220 115 187 L101 119 Q102 101 121 94Z"/>
      <path d="M111 276 Q133 266 148 288 L142 382 136 446 133 518 Q126 528 110 520 L108 446 104 390 Q95 313 111 276Z"/>
      <path d="M189 276 Q167 266 152 288 L158 382 164 446 167 518 Q174 528 190 520 L192 446 196 390 Q205 313 189 276Z"/>
      {bareFeet && <><path d="M110 513 Q121 509 133 516 L135 535 Q130 547 102 545 Q95 538 101 529Z"/>
      <path d="M190 513 Q179 509 167 516 L165 535 Q170 547 198 545 Q205 538 199 529Z"/></>}
      {longSleeves ? <g clipPath={dressed ? `url(#${id}-clothed)` : undefined} transform={coat ? 'translate(0 24)' : undefined}>
        <path d="M108 119 Q96 111 85 132 L66 183 38 267 Q32 282 40 290 Q48 296 54 280 L86 198 119 141Z"/>
        <path d="M192 119 Q204 111 215 132 L234 183 262 267 Q268 282 260 290 Q252 296 246 280 L214 198 181 141Z"/>
        <path d="M39 278 Q31 284 29 295 L28 308 Q31 315 34 305 L37 298 Q37 318 43 316 L50 301 53 286Z"/>
        <path d="M261 278 Q269 284 271 295 L272 308 Q269 315 266 305 L263 298 Q263 318 257 316 L250 301 247 286Z"/>
      </g> : <g clipPath={dressed ? `url(#${id}-clothed)` : undefined}>
        <path d="M108 119 Q96 111 83 135 L62 175 Q55 191 52 217 L47 266 Q49 276 60 272 L71 222 83 194 119 141Z"/>
        <path d="M192 119 Q204 111 217 135 L238 175 Q245 191 248 217 L253 266 Q251 276 240 272 L229 222 217 194 181 141Z"/>
        <path d="M48 261 Q40 270 39 284 L40 298 Q44 302 45 289 L48 282 Q47 307 53 304 L62 286 61 265Z"/>
        <path d="M252 261 Q260 270 261 284 L260 298 Q256 302 255 289 L252 282 Q253 307 247 304 L238 286 239 265Z"/>
      </g>}
    </g>
    <path d="M129 30 Q132 12 150 12 Q168 12 171 30 L173 49 Q171 67 160 75 Q150 81 140 75 Q129 67 127 49Z" fill={`url(#${head})`} stroke="#c4c1b6" strokeWidth=".6"/>
    {!back && <path d="M150 36 Q147 47 148 54 L154 54 M142 65 Q150 68 158 65" fill="none" stroke="#c1bdb1" strokeWidth=".9" opacity=".5"/>}
    <path d="M125 101 Q150 112 175 101" fill="none" stroke="#bbb8ad" opacity=".35"/>
  </svg>
}
