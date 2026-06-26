type Props = {
  onGenerate: () => void
  isGenerating: boolean
}

/**
 * Minimal neumorphic pill button that generates an AI image of a minimalist
 * living space (keyless Pollinations). Shows a pressed "Generating…" state while
 * a request is in flight.
 */
export function GenerateButton({ onGenerate, isGenerating }: Props) {
  return (
    <button
      className={`gen-btn ${isGenerating ? 'is-busy' : ''}`}
      onClick={onGenerate}
      disabled={isGenerating}
      aria-busy={isGenerating}
    >
      <Sparkle />
      <span>{isGenerating ? 'Generating…' : 'Generate Space'}</span>
    </button>
  )
}

function Sparkle() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
      <path d="M12 2.5l1.7 5.3a3 3 0 0 0 1.9 1.9l5.3 1.7-5.3 1.7a3 3 0 0 0-1.9 1.9L12 21.5l-1.7-5.3a3 3 0 0 0-1.9-1.9L3.1 12.6l5.3-1.7a3 3 0 0 0 1.9-1.9z" />
    </svg>
  )
}
