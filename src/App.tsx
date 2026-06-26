import { useEffect, useRef, useState } from 'react'
import { GenerateButton } from './components/GenerateButton'
import { ImageStage } from './components/ImageStage'
import { TransitionPicker } from './components/TransitionPicker'
import { buildGeneratedImage, IMAGES, type GalleryImage } from './data/images'
import { useGallery, type TransitionType } from './hooks/useGallery'
import './App.css'

export default function App() {
  const [images, setImages] = useState<GalleryImage[]>(IMAGES)
  const [isGenerating, setIsGenerating] = useState(false)
  const g = useGallery(images.length)

  // The picker is the primary control: selecting an effect also plays it.
  const play = (t: TransitionType) => {
    g.setTransition(t)
    g.next()
  }

  // Jump to a freshly appended image once the list has grown.
  const pendingJump = useRef(false)
  useEffect(() => {
    if (pendingJump.current) {
      pendingJump.current = false
      g.goTo(images.length - 1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length])

  // Generate a minimalist living space and add it to the gallery.
  const generate = () => {
    if (isGenerating) return
    setIsGenerating(true)
    const seed = Math.floor(Math.random() * 1_000_000)
    const img = buildGeneratedImage(seed, images.length + 1)

    const finish = () => {
      pendingJump.current = true
      setImages((prev) => [...prev, img])
      setIsGenerating(false)
    }

    // Preload so we transition to a ready image; proceed anyway after a timeout.
    const pre = new Image()
    const timer = window.setTimeout(finish, 20000)
    const done = () => {
      window.clearTimeout(timer)
      finish()
    }
    pre.onload = done
    pre.onerror = done
    pre.src = img.src
  }

  const current = images[g.index]

  return (
    <div className="page">
      <header className="masthead">
        <span className="masthead__index">3</span>
        <div className="masthead__divider" />
        <div>
          <h1 className="masthead__title">Panarama</h1>
          <p className="masthead__sub">Image transition states</p>
        </div>
      </header>

      <main className="stage-col">
        <div className="section-label">Transition</div>
        <TransitionPicker value={g.transition} onSelect={play} />

        <ImageStage
          images={images}
          index={g.index}
          prevIndex={g.prevIndex}
          direction={g.direction}
          transition={g.transition}
          isAnimating={g.isAnimating}
          onAdvance={g.next}
        />

        <div className="stage-footer">
          <div className="stage-meta">
            <span className="stage-meta__index">
              {String(g.index + 1).padStart(2, '0')}
            </span>
            <span className="stage-meta__title">{current.title}</span>
          </div>

          <GenerateButton onGenerate={generate} isGenerating={isGenerating} />
        </div>
      </main>
    </div>
  )
}
