import {useEffect,useState} from 'react'

/** Retry a failed image when its source changes or the connection returns. */
export function useImageFailure(source: string | undefined) {
  const [failedSource,setFailedSource] = useState<string>()
  useEffect(() => { setFailedSource(undefined) }, [source])
  useEffect(() => {
    const retry = () => setFailedSource(undefined)
    window.addEventListener('online',retry)
    return () => window.removeEventListener('online',retry)
  },[])
  return { failed: Boolean(source && failedSource === source), fail: () => setFailedSource(source) }
}
