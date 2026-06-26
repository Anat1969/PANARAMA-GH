import { Controls } from './components/Controls'
import { ImageStage } from './components/ImageStage'
import { Thumbnails } from './components/Thumbnails'
import { TransitionPicker } from './components/TransitionPicker'
import { IMAGES } from './data/images'
import { useGallery } from './hooks/useGallery'
import './App.css'

export default function App() {
  const g = useGallery(IMAGES.length)

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

      <main className="layout">
        <section className="stage-col">
          <ImageStage
            images={IMAGES}
            index={g.index}
            prevIndex={g.prevIndex}
            direction={g.direction}
            transition={g.transition}
            isAnimating={g.isAnimating}
          />

          <Controls
            onPrev={g.prev}
            onNext={g.next}
            onTogglePlay={g.togglePlay}
            isPlaying={g.isPlaying}
          />
        </section>

        <aside className="panel neu-raised">
          <TransitionPicker value={g.transition} onChange={g.setTransition} />

          <div className="panel__divider" />

          <div className="panel__section">
            <span className="panel__label">Gallery</span>
            <Thumbnails images={IMAGES} index={g.index} onSelect={g.goTo} />
          </div>

          <div className="panel__counter">
            <span>{String(g.index + 1).padStart(2, '0')}</span>
            <span className="panel__counter-sep">/</span>
            <span>{String(IMAGES.length).padStart(2, '0')}</span>
          </div>
        </aside>
      </main>

      <footer className="footer">
        Fade · Slide · Zoom — neumorphic UI from the Elements style board
      </footer>
    </div>
  )
}
