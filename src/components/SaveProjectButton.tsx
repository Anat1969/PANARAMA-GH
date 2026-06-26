import { useState } from 'react'
import { saveProject } from '../lib/projectApi'

type Props = {
  original: File | null
  generated: File | null
  interpretation: string
  prompt: string
}

/** Saves the pair of images + interpretation/prompt to Supabase. */
export function SaveProjectButton({
  original,
  generated,
  interpretation,
  prompt,
}: Props) {
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const ready = !!original && !!generated
  const label =
    state === 'saving'
      ? 'שומר…'
      : state === 'saved'
        ? 'נשמר ✓'
        : 'שמירת פרויקט'

  const save = async () => {
    if (!original || !generated) return
    setState('saving')
    setMessage('')
    try {
      const res = await saveProject({ original, generated, interpretation, prompt })
      setState('saved')
      setMessage(
        res.where === 'supabase'
          ? `נשמר בספרייה ול-Supabase (${res.id?.slice(0, 8)}…).`
          : 'נשמר בספרייה.',
      )
    } catch (err) {
      setState('error')
      setMessage(String(err instanceof Error ? err.message : err))
    }
  }

  return (
    <div className="save">
      <button
        className="gen-btn"
        onClick={save}
        disabled={!ready || state === 'saving'}
      >
        {label}
      </button>
      {message && (
        <span className={`save__msg ${state === 'error' ? 'is-error' : ''}`}>
          {message}
        </span>
      )}
    </div>
  )
}
