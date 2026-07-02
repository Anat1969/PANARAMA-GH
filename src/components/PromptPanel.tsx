import { useState } from 'react'
import type { PromptResult } from '../lib/projectApi'

type Props = {
  result: PromptResult | null
  isBusy: boolean
  error: string | null
  hasImage: boolean
  onCreate: () => void
  onRefine: (feedback: string) => void
}

/**
 * Shows the Claude interpretation + Midjourney prompt, with Copy / Create /
 * Refine controls. Refine takes optional free-text feedback.
 */
export function PromptPanel({
  result,
  isBusy,
  error,
  hasImage,
  onCreate,
  onRefine,
}: Props) {
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState('')

  const copy = async () => {
    if (!result?.prompt) return
    try {
      await navigator.clipboard.writeText(result.prompt)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  return (
    <section className="panel neu-raised">
      <div className="panel__head">
        <span className="panel__label">פרשנות</span>
      </div>

      {error && <p className="panel__error">{error}</p>}

      {!result && !error && (
        <p className="panel__placeholder">
          {hasImage
            ? 'לחצו על "צור פרומפט" כדי לקרוא את התמונה ולכתוב פרומפט ל-Midjourney.'
            : 'העלו, גררו או הדביקו תמונה למעלה כדי להתחיל.'}
        </p>
      )}

      {result && (
        <>
          <p className="panel__interpretation">{result.interpretation}</p>
          <div className="panel__prompt">
            <span className="panel__label">פרומפט ל-Midjourney</span>
            <p dir="ltr" lang="en">{result.prompt}</p>
            <button className="copy-btn" onClick={copy} disabled={!result.prompt}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              {copied ? 'הועתק ✓' : 'העתקה ל-Midjourney'}
            </button>
          </div>
        </>
      )}

      <div className="panel__actions">
        <button
          className="gen-btn"
          onClick={onCreate}
          disabled={!hasImage || isBusy}
        >
          {isBusy ? 'קורא תמונה…' : result ? 'יצירה מחדש' : 'צור פרומפט'}
        </button>

        {result && (
          <div className="refine">
            <input
              className="refine__input"
              placeholder="חידוד: למשל חמים יותר, יותר עץ, אור ערב…"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              disabled={isBusy}
            />
            <button
              className="gen-btn gen-btn--ghost"
              onClick={() => onRefine(feedback)}
              disabled={isBusy}
            >
              חדד פרומפט
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
