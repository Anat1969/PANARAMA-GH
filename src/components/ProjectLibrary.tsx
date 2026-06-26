import { useEffect, useState } from 'react'
import { dbDeleteProject, dbListProjects, type StoredProject } from '../lib/projectDb'
import type { PromptResult } from '../lib/projectApi'

type LoadPayload = {
  originalFile: File
  originalUrl: string
  generatedFile: File
  generatedUrl: string
  result: PromptResult
}

type Props = {
  onClose: () => void
  onLoad: (payload: LoadPayload) => void
}

export function ProjectLibrary({ onClose, onLoad }: Props) {
  const [projects, setProjects] = useState<StoredProject[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    dbListProjects()
      .then(setProjects)
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id: string) => {
    setDeleting(id)
    await dbDeleteProject(id)
    setProjects((prev) => prev.filter((p) => p.id !== id))
    setDeleting(null)
  }

  const handleLoad = (p: StoredProject) => {
    const originalFile = new File([p.originalBlob], 'original.jpg', {
      type: p.originalBlob.type || 'image/jpeg',
    })
    const generatedFile = new File([p.generatedBlob], 'generated.jpg', {
      type: p.generatedBlob.type || 'image/jpeg',
    })
    onLoad({
      originalFile,
      originalUrl: URL.createObjectURL(p.originalBlob),
      generatedFile,
      generatedUrl: URL.createObjectURL(p.generatedBlob),
      result: { interpretation: p.interpretation, prompt: p.prompt },
    })
  }

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="library-overlay" onClick={onClose}>
      <div className="library-container" onClick={(e) => e.stopPropagation()}>
        <div className="library-header">
          <h2 className="library-title">ספרייה</h2>
          <button className="library-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {loading && <p className="library-empty">טוען…</p>}

        {!loading && projects.length === 0 && (
          <p className="library-empty">אין פרויקטים שמורים עדיין.</p>
        )}

        {!loading && projects.length > 0 && (
          <div className="library-grid">
            {projects.map((p) => (
              <div key={p.id} className="library-card neu-raised">
                <div className="library-card__thumbs">
                  <img src={p.thumbOriginal} alt="" className="library-card__thumb" />
                  <span className="library-card__arrow">→</span>
                  <img src={p.thumbGenerated} alt="" className="library-card__thumb" />
                </div>
                <p className="library-card__text">{p.interpretation}</p>
                <span className="library-card__date">{formatDate(p.createdAt)}</span>
                <div className="library-card__actions">
                  <button
                    className="gen-btn"
                    onClick={() => handleLoad(p)}
                  >
                    טעינה
                  </button>
                  <button
                    className="link-btn"
                    onClick={() => handleDelete(p.id)}
                    disabled={deleting === p.id}
                  >
                    {deleting === p.id ? 'מוחק…' : 'מחיקה'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
