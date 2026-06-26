import type { TransitionType } from '../hooks/useGallery'

type Props = {
  value: TransitionType
  onChange: (t: TransitionType) => void
}

const OPTIONS: { key: TransitionType; label: string; hint: string }[] = [
  { key: 'fade', label: 'Fade', hint: 'Crossfade dissolve' },
  { key: 'slide', label: 'Slide', hint: 'Horizontal slide' },
  { key: 'zoom', label: 'Zoom', hint: 'Scale & fade' },
]

/**
 * Three neumorphic toggle buttons. The selected one uses the pressed/inset
 * shadow (the board's "INNER SHADOWS" state).
 */
export function TransitionPicker({ value, onChange }: Props) {
  return (
    <div className="picker" role="tablist" aria-label="Transition effect">
      <span className="picker__label">Transition</span>
      <div className="picker__group">
        {OPTIONS.map((opt) => {
          const active = opt.key === value
          return (
            <button
              key={opt.key}
              role="tab"
              aria-selected={active}
              title={opt.hint}
              className={`picker__btn ${active ? 'is-active' : ''}`}
              onClick={() => onChange(opt.key)}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
