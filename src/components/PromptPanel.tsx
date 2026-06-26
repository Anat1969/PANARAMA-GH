import { useState } from 'react'
import type { PromptResult } from '../lib/projectApi'

type Props = {
  result: PromptResult | null
  isBusy: boolean
  error: string | null
  hasImage: boolean
  onCreate: () => void
  onStructure: () => void
  onRefine: (feedback: string) => void
}

export function PromptPanel({
  result,
  isBusy,
  error,
  hasImage,
  onCreate,
  onStructure,
  onRefine,
}: Props) {
  const [copied, setCopied] = useState(false)
  const [copiedFull, setCopiedFull] = useState(false)
  const [feedback, setFeedback] = useState('')

  const copyPrompt = async () => {
    if (!result?.prompt) return
    try {
      await navigator.clipboard.writeText(result.prompt)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard blocked */
    }
  }

  const copyFull = async () => {
    if (!result) return
    const text = `${result.interpretation}\n\n---\n\n${result.prompt}`
    try {
      await navigator.clipboard.writeText(text)
      setCopiedFull(true)
      window.setTimeout(() => setCopiedFull(false), 1600)
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <section className="panel neu-raised">
      <div className="panel__head">
        <span className="panel__label">פרשנות</span>
        {result && (
          <div className="panel__copy-group">
            <button className="link-btn" onClick={copyPrompt} disabled={!result.prompt}>
              {copied ? 'הועתק ✓' : 'העתקת פרומפט'}
            </button>
            <button className="link-btn" onClick={copyFull}>
              {copiedFull ? 'הועתק ✓' : 'העתקת הכל'}
            </button>
          </div>
        )}
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
          </div>
        </>
      )}

      <div className="panel__actions">
        <div className="panel__create-row">
          <button
            className="gen-btn"
            onClick={onCreate}
            disabled={!hasImage || isBusy}
          >
            {isBusy ? 'קורא תמונה…' : result ? 'יצירה מחדש' : 'צור פרומפט'}
          </button>
          <button
            className="gen-btn gen-btn--structure"
            onClick={onStructure}
            disabled={!hasImage || isBusy}
          >
            מבנה מינימליסטי
          </button>
        </div>

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
