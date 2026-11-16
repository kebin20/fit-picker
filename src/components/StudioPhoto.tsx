import type { PhotoAngle, StudioPhoto as Photo } from '../lib/studio-photos'

export default function StudioPhoto({ photo, angle, summary, onError }: {
  photo: Photo; angle: PhotoAngle; summary: string; onError: () => void
}) {
  const view = photo.angles.includes(angle) ? angle : 'front'
  return <figure className={`studio-photo ${photo.triptych ? 'studio-photo--three-views' : ''}`} data-angle={view}>
    <div className="studio-photo__frame"><img key={photo.src} src={photo.src} srcSet={photo.srcSet}
      sizes="(max-width: 700px) calc(100vw - 40px), (max-width: 1190px) calc(100vw - 160px), 650px"
      width={photo.width} height={photo.height} decoding="async" onError={onError}
      alt={`${view[0].toUpperCase() + view.slice(1)} view: ${summary}. Generated styling illustration.`}/></div>
    <figcaption>Generated styling preview · {view} view</figcaption>
  </figure>
}
