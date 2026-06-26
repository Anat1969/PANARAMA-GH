import type { TransitionType } from '../hooks/useGallery'

type Props = {
  value: TransitionType
  /** Fires on every click — even re-clicking the active effect, so it replays. */
  onSelect: (t: TransitionType) => void
}

const OPTIONS: { key: TransitionType; label: string }[] = [
  { key: 'fade', label: 'דהייה' },
  { key: 'slide', label: 'החלקה' },
  { key: 'zoom', label: 'זום' },
]

/**
 * Three plain thin text labels — the only control in the minimalist layout.
 * Clicking a label selects that effect and plays it (App advances the image).
 */
export function TransitionPicker({ value, onSelect }: Props) {
  return (
    <nav className="picker" aria-label="Transition effect">
      {OPTIONS.map((opt) => {
        const active = opt.key === value
        return (
          <button
            key={opt.key}
            aria-pressed={active}
            className={`picker__item ${active ? 'is-active' : ''}`}
            onClick={() => onSelect(opt.key)}
          >
            {opt.label}
          </button>
        )
      })}
    </nav>
  )
}
