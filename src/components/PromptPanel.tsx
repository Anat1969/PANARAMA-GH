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
        <span className="panel__label">Interpretation</span>
        {result && (
          <button className="link-btn" onClick={copy} disabled={!result.prompt}>
            {copied ? 'Copied ✓' : 'Copy prompt'}
          </button>
        )}
      </div>

      {error && <p className="panel__error">{error}</p>}

      {!result && !error && (
        <p className="panel__placeholder">
          {hasImage
            ? 'Click “Create Prompt” to read your image and write a Midjourney prompt.'
            : 'Upload, drag, or paste an image above to begin.'}
        </p>
      )}

      {result && (
        <>
          <p className="panel__interpretation">{result.interpretation}</p>
          <div className="panel__prompt">
            <span className="panel__label">Midjourney prompt</span>
            <p>{result.prompt}</p>
          </div>
        </>
      )}

      <div className="panel__actions">
        <button
          className="gen-btn"
          onClick={onCreate}
          disabled={!hasImage || isBusy}
        >
          {isBusy ? 'Reading image…' : result ? 'Regenerate' : 'Create Prompt'}
        </button>

        {result && (
          <div className="refine">
            <input
              className="refine__input"
              placeholder="Refine: e.g. warmer, more wood, evening light…"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              disabled={isBusy}
            />
            <button
              className="gen-btn gen-btn--ghost"
              onClick={() => onRefine(feedback)}
              disabled={isBusy}
            >
              Refine Prompt
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
