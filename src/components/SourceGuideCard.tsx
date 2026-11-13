import { useState } from 'react'
import { Expand, FileImage } from 'lucide-react'

export default function SourceGuideCard({ source }: { source: { title: string; image: string; thumbnail?: string } }) {
  const [failed, setFailed] = useState(false)
  return <a href={source.image} target="_blank" rel="noreferrer" aria-label={`Open full-size ${source.title}`}>
    {failed ? <div className="guide-load-fallback"><FileImage size={26}/><strong>Open the full guide</strong><small>Preview unavailable on this device</small></div> : <img src={source.thumbnail || source.image} alt={source.title} loading="lazy" decoding="async" onError={() => setFailed(true)}/>}
    <span>{source.title}<Expand size={16}/></span>
  </a>
}
