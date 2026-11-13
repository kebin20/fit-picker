import { useEffect, useRef, useState } from 'react'

/** Native lazy loading can fetch far beyond a phone's visible area. Give card
 * images a small, explicit loading window while preserving their layout. */
export function useDeferredImage(source: string | undefined) {
  const ref = useRef<HTMLImageElement>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (!source || ready) return
    if (!('IntersectionObserver' in window)) { setReady(true); return }
    const image = ref.current
    if (!image) return
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setReady(true)
        observer.disconnect()
      }
    }, { rootMargin: '200px 0px' })
    observer.observe(image)
    return () => observer.disconnect()
  }, [source, ready])
  return { ref, ready }
}
