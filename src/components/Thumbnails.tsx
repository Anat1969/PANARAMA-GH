import type { CSSProperties } from 'react'
import type { GalleryImage } from '../data/images'

type Props = {
  images: GalleryImage[]
  index: number
  onSelect: (i: number) => void
}

/** Neumorphic thumbnail strip — jump straight to any image. */
export function Thumbnails({ images, index, onSelect }: Props) {
  return (
    <div className="thumbs" role="tablist" aria-label="Gallery thumbnails">
      {images.map((img, i) => {
        const style: CSSProperties = {
          backgroundImage: `url(${img.src}), ${img.fallback}`,
        }
        const active = i === index
        return (
          <button
            key={img.id}
            role="tab"
            aria-selected={active}
            aria-label={`Show ${img.title}`}
            className={`thumb ${active ? 'is-active' : ''}`}
            style={style}
            onClick={() => onSelect(i)}
          />
        )
      })}
    </div>
  )
}
