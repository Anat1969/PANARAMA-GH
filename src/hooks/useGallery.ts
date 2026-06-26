import { useCallback, useEffect, useRef, useState } from 'react'

export type TransitionType = 'fade' | 'slide' | 'zoom'
export type Direction = 'next' | 'prev'

const AUTOPLAY_MS = 3500

export type GalleryState = {
  index: number
  prevIndex: number | null
  direction: Direction
  transition: TransitionType
  isAnimating: boolean
  isPlaying: boolean
}

export function useGallery(count: number) {
  const [index, setIndex] = useState(0)
  const [prevIndex, setPrevIndex] = useState<number | null>(null)
  const [direction, setDirection] = useState<Direction>('next')
  const [transition, setTransition] = useState<TransitionType>('fade')
  const [isAnimating, setIsAnimating] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  // Guard against starting a new transition mid-animation.
  const animatingRef = useRef(false)

  const go = useCallback(
    (target: number, dir: Direction) => {
      if (count <= 1 || animatingRef.current) return
      const next = ((target % count) + count) % count
      if (next === index) return
      animatingRef.current = true
      setDirection(dir)
      setPrevIndex(index)
      setIndex(next)
      setIsAnimating(true)
    },
    [count, index],
  )

  const next = useCallback(() => go(index + 1, 'next'), [go, index])
  const prev = useCallback(() => go(index - 1, 'prev'), [go, index])
  const goTo = useCallback(
    (target: number) => go(target, target > index ? 'next' : 'prev'),
    [go, index],
  )

  // Clear the animating state once the layer's animation finishes. We don't
  // rely solely on the CSS event — a timeout matches the token duration and
  // guarantees the previous layer is removed.
  useEffect(() => {
    if (!isAnimating) return
    const id = window.setTimeout(() => {
      setIsAnimating(false)
      setPrevIndex(null)
      animatingRef.current = false
    }, 650)
    return () => window.clearTimeout(id)
  }, [isAnimating, index])

  // Autoplay.
  useEffect(() => {
    if (!isPlaying || count <= 1) return
    const id = window.setInterval(() => {
      // Read latest index via functional updater path in `next`.
      next()
    }, AUTOPLAY_MS)
    return () => window.clearInterval(id)
  }, [isPlaying, count, next])

  const togglePlay = useCallback(() => setIsPlaying((p) => !p), [])

  return {
    index,
    prevIndex,
    direction,
    transition,
    isAnimating,
    isPlaying,
    next,
    prev,
    goTo,
    setTransition,
    togglePlay,
  }
}
