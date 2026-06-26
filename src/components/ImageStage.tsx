import type { CSSProperties } from 'react'
import type { GalleryImage } from '../data/images'
import type { Direction, TransitionType } from '../hooks/useGallery'

type Props = {
  images: GalleryImage[]
  index: number
  prevIndex: number | null
  direction: Direction
  transition: TransitionType
  isAnimating: boolean
  /** Advance to the next image using the current effect. */
  onAdvance?: () => void
}

function layerStyle(img: GalleryImage): CSSProperties {
  return {
    backgroundImage: `url(${img.src}), ${img.fallback}`,
  }
}

/**
 * Two stacked layers. The current layer animates IN and the previous layer
 * (only mounted while animating) animates OUT. The chosen effect/direction is
 * expressed via data-attributes consumed by transitions.css.
 */
export function ImageStage({
  images,
  index,
  prevIndex,
  direction,
  transition,
  isAnimating,
  onAdvance,
}: Props) {
  const current = images[index]
  const previous = prevIndex !== null ? images[prevIndex] : null

  return (
    <div
      className="stage-frame neu-raised-lg"
      onClick={onAdvance}
      role={onAdvance ? 'button' : undefined}
      aria-label={onAdvance ? 'Next image' : undefined}
      tabIndex={onAdvance ? 0 : undefined}
      onKeyDown={
        onAdvance
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onAdvance()
              }
            }
          : undefined
      }
    >
      <div
        className="stage"
        data-transition={transition}
        data-direction={direction}
        data-animating={isAnimating ? 'true' : 'false'}
      >
        {previous && (
          <div
            key={`prev-${prevIndex}`}
            className="layer layer--prev"
            style={layerStyle(previous)}
            aria-hidden="true"
          />
        )}
        <div
          key={`cur-${index}`}
          className="layer layer--current"
          style={layerStyle(current)}
          role="img"
          aria-label={current.title}
        />
      </div>
    </div>
  )
}
