type Props = {
  onPrev: () => void
  onNext: () => void
  onTogglePlay: () => void
  isPlaying: boolean
}

/** Neumorphic round controls: prev, play/pause, next. */
export function Controls({ onPrev, onNext, onTogglePlay, isPlaying }: Props) {
  return (
    <div className="controls">
      <button className="ctrl-btn" onClick={onPrev} aria-label="Previous image">
        <Chevron dir="left" />
      </button>

      <button
        className="ctrl-btn ctrl-btn--play"
        onClick={onTogglePlay}
        aria-label={isPlaying ? 'Pause autoplay' : 'Start autoplay'}
        aria-pressed={isPlaying}
      >
        {isPlaying ? <Pause /> : <Play />}
      </button>

      <button className="ctrl-btn" onClick={onNext} aria-label="Next image">
        <Chevron dir="right" />
      </button>
    </div>
  )
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  const d = dir === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path d={d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Play() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  )
}

function Pause() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <rect x="7" y="5.5" width="3.4" height="13" rx="1.2" />
      <rect x="13.6" y="5.5" width="3.4" height="13" rx="1.2" />
    </svg>
  )
}
