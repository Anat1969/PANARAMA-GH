import { useEffect, useMemo, useRef, useState } from 'react'
import { ImageDrop } from './components/ImageDrop'
import { ImageStage } from './components/ImageStage'
import { ProjectLibrary } from './components/ProjectLibrary'
import { PromptPanel } from './components/PromptPanel'
import { SaveProjectButton } from './components/SaveProjectButton'
import { TransitionPicker } from './components/TransitionPicker'
import { UpgradeLink } from './components/UpgradeLink'
import { imageFromUrl } from './data/images'
import { useGallery, type TransitionType } from './hooks/useGallery'
import { SUPABASE_CONFIGURED } from './lib/config'
import { generatePrompt, type PromptResult } from './lib/projectApi'
import './App.css'

type Slot = { file: File; url: string } | null

export default function App() {
  const [original, setOriginal] = useState<Slot>(null)
  const [generated, setGenerated] = useState<Slot>(null)
  const [result, setResult] = useState<PromptResult | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showLibrary, setShowLibrary] = useState(false)
  const [scrollToTransition, setScrollToTransition] = useState(false)

  const transitionRef = useRef<HTMLElement>(null)
  const g = useGallery(2)

  const setSlot =
    (set: (s: Slot) => void, prev: Slot) =>
    (file: File) => {
      if (prev) URL.revokeObjectURL(prev.url)
      set({ file, url: URL.createObjectURL(file) })
    }

  const run = async (mode: 'create' | 'refine' | 'structure', feedback = '') => {
    if (!original) return
    setIsBusy(true)
    setError(null)
    try {
      const res = await generatePrompt(original.file, {
        mode,
        previousPrompt: result?.prompt ?? '',
        feedback,
      })
      setResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsBusy(false)
    }
  }

  const newProject = () => {
    if (original) URL.revokeObjectURL(original.url)
    if (generated) URL.revokeObjectURL(generated.url)
    setOriginal(null)
    setGenerated(null)
    setResult(null)
    setError(null)
  }

  const loadFromLibrary = (payload: {
    originalFile: File
    originalUrl: string
    generatedFile: File
    generatedUrl: string
    result: PromptResult
  }) => {
    if (original) URL.revokeObjectURL(original.url)
    if (generated) URL.revokeObjectURL(generated.url)
    setOriginal({ file: payload.originalFile, url: payload.originalUrl })
    setGenerated({ file: payload.generatedFile, url: payload.generatedUrl })
    setResult(payload.result)
    setError(null)
    setShowLibrary(false)
    setScrollToTransition(true)
  }

  useEffect(() => {
    if (scrollToTransition && transitionRef.current) {
      transitionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setScrollToTransition(false)
    }
  }, [scrollToTransition, original, generated])

  const play = (t: TransitionType) => {
    g.setTransition(t)
    g.next()
  }

  const pair = useMemo(
    () =>
      original && generated
        ? [
            imageFromUrl(original.url, 'Your image', 'A', 0),
            imageFromUrl(generated.url, 'Minimalist space', 'B', 1),
          ]
        : null,
    [original, generated],
  )

  return (
    <div className="page">
      <header className="masthead">
        <span className="masthead__index">3</span>
        <div className="masthead__divider" />
        <div>
          <h1 className="masthead__title">Panarama</h1>
          <p className="masthead__sub">תמונה · פרומפט · מעבר</p>
        </div>
        <div className="masthead__actions">
          <button
            className="masthead__library-btn"
            onClick={newProject}
          >
            פרויקט חדש
          </button>
          <button
            className="masthead__library-btn"
            onClick={() => setShowLibrary(true)}
          >
            ספרייה
          </button>
        </div>
      </header>

      {!SUPABASE_CONFIGURED && (
        <div className="notice">
          פועל ב<strong>מצב מקומי</strong> — ללא הגדרות. הפרומפט נבנה בדפדפן מתוך
          התמונה, ו"שמירת פרויקט" שומרת לתיקייה שתבחרו. הוסיפו מפתח Supabase ב־
          <code>src/lib/config.ts</code> כדי לקבל פרומפט שכתוב על־ידי Claude ושמירה בענן.
        </div>
      )}

      <main className="flow">
        {/* Step 1 — upload the reference image */}
        <section className="step">
          <span className="step__num">01</span>
          <div className="step__body">
            <span className="section-label">התמונה שלך</span>
            <ImageDrop
              label="העלאת תמונת מקור"
              hint="לחיצה · גרירה · או הדבקה (⌘/Ctrl+V)"
              previewUrl={original?.url ?? null}
              onImage={setSlot(setOriginal, original)}
            />
          </div>
        </section>

        {/* Step 2 — generate / refine the Midjourney prompt */}
        <section className="step">
          <span className="step__num">02</span>
          <div className="step__body">
            <PromptPanel
              result={result}
              isBusy={isBusy}
              error={error}
              hasImage={!!original}
              onCreate={() => run('create')}
              onStructure={() => run('structure')}
              onRefine={(fb) => run('refine', fb)}
            />
          </div>
        </section>

        {/* Step 3 — paste the Midjourney image back */}
        <section className="step">
          <span className="step__num">03</span>
          <div className="step__body">
            <span className="section-label">תמונת Midjourney</span>
            <ImageDrop
              label="הדבקת התמונה שנוצרה"
              hint="לחיצה · גרירה · או הדבקה (⌘/Ctrl+V)"
              previewUrl={generated?.url ?? null}
              onImage={setSlot(setGenerated, generated)}
            />
          </div>
        </section>

        {/* Step 4 — connect the two images with a transition */}
        {pair && (
          <section className="step" ref={transitionRef}>
            <span className="step__num">04</span>
            <div className="step__body">
              <span className="section-label">מעבר</span>
              <TransitionPicker value={g.transition} onSelect={play} />
              <ImageStage
                images={pair}
                index={g.index}
                prevIndex={g.prevIndex}
                direction={g.direction}
                transition={g.transition}
                isAnimating={g.isAnimating}
                onAdvance={g.next}
              />
              <div className="stage-footer">
                <span className="stage-meta__title">
                  {g.index === 0 ? 'התמונה שלך' : 'מרחב מינימליסטי'}
                </span>
                <SaveProjectButton
                  original={original?.file ?? null}
                  generated={generated?.file ?? null}
                  interpretation={result?.interpretation ?? ''}
                  prompt={result?.prompt ?? ''}
                />
              </div>
            </div>
          </section>
        )}

        {/* Upgrade */}
        <section className="upgrade-section">
          <a
            className="upgrade-btn neu-raised"
            href="https://anat1969.github.io/PANARAMA-GH/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5" />
              <path d="M5 12l7-7 7 7" />
            </svg>
            שדרוג לגרסה המלאה
          </a>
        </section>
      </main>

      {showLibrary && (
        <ProjectLibrary
          onClose={() => setShowLibrary(false)}
          onLoad={loadFromLibrary}
        />
      )}

      <UpgradeLink />
    </div>
  )
}
