import { Expand, FileImage } from 'lucide-react'
import { useImageFailure } from '../lib/use-image-failure'

export default function SourceGuideCard({ source }: { source: { title: string; image: string; thumbnail?: string } }) {
  const sourceURL = source.thumbnail || source.image
  const {failed,fail} = useImageFailure(sourceURL)
  return <a href={source.image} target="_blank" rel="noreferrer" aria-label={`Open full-size ${source.title}`}>
    {failed ? <div className="guide-load-fallback"><FileImage size={26}/><strong>Open the full guide</strong><small>Preview unavailable on this device</small></div> : <img key={sourceURL} src={sourceURL} alt={source.title} loading="lazy" decoding="async" onError={fail}/>}
    <span>{source.title}<Expand size={16}/></span>
  </a>
}
