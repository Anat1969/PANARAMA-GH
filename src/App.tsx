import { ImageStage } from './components/ImageStage'
import { TransitionPicker } from './components/TransitionPicker'
import { IMAGES } from './data/images'
import { useGallery, type TransitionType } from './hooks/useGallery'
import './App.css'

export default function App() {
  const g = useGallery(IMAGES.length)

  // The picker is the only control: selecting an effect also plays it.
  const play = (t: TransitionType) => {
    g.setTransition(t)
    g.next()
  }

  const current = IMAGES[g.index]

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
          images={IMAGES}
          index={g.index}
          prevIndex={g.prevIndex}
          direction={g.direction}
          transition={g.transition}
          isAnimating={g.isAnimating}
          onAdvance={g.next}
        />

        <div className="stage-meta">
          <span className="stage-meta__index">
            {String(g.index + 1).padStart(2, '0')}
          </span>
          <span className="stage-meta__title">{current.title}</span>
        </div>
      </main>
    </div>
  )
}
