import { useEffect, useState } from 'react'
import { dbDeleteProject, dbListProjects, type StoredProject } from '../lib/projectDb'
import { listCloudProjects, type CloudProject, type PromptResult } from '../lib/projectApi'

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

type UnifiedProject = {
  id: string
  createdAt: number
  interpretation: string
  prompt: string
  source: 'local' | 'cloud'
  thumbOriginal?: string
  thumbGenerated?: string
  originalUrl?: string
  generatedUrl?: string
  localProject?: StoredProject
}

function mergeProjects(
  local: StoredProject[],
  cloud: CloudProject[],
): UnifiedProject[] {
  const items: UnifiedProject[] = []

  for (const p of local) {
    items.push({
      id: p.id,
      createdAt: p.createdAt,
      interpretation: p.interpretation,
      prompt: p.prompt,
      source: 'local',
      thumbOriginal: p.thumbOriginal,
      thumbGenerated: p.thumbGenerated,
      localProject: p,
    })
  }

  const localIds = new Set(local.map((p) => p.id))
  for (const p of cloud) {
    if (localIds.has(p.id)) continue
    items.push({
      id: p.id,
      createdAt: p.createdAt,
      interpretation: p.interpretation,
      prompt: p.prompt,
      source: 'cloud',
      originalUrl: p.originalUrl,
      generatedUrl: p.generatedUrl,
    })
  }

  items.sort((a, b) => b.createdAt - a.createdAt)
  return items
}

export function ProjectLibrary({ onClose, onLoad }: Props) {
  const [projects, setProjects] = useState<UnifiedProject[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [loadingProject, setLoadingProject] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      dbListProjects(),
      listCloudProjects(),
    ])
      .then(([local, cloud]) => setProjects(mergeProjects(local, cloud)))
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id: string) => {
    setDeleting(id)
    await dbDeleteProject(id)
    setProjects((prev) => prev.filter((p) => p.id !== id))
    setDeleting(null)
  }

  const handleLoad = async (p: UnifiedProject) => {
    if (p.source === 'local' && p.localProject) {
      const lp = p.localProject
      const originalFile = new File([lp.originalBlob], 'original.jpg', {
        type: lp.originalBlob.type || 'image/jpeg',
      })
      const generatedFile = new File([lp.generatedBlob], 'generated.jpg', {
        type: lp.generatedBlob.type || 'image/jpeg',
      })
      onLoad({
        originalFile,
        originalUrl: URL.createObjectURL(lp.originalBlob),
        generatedFile,
        generatedUrl: URL.createObjectURL(lp.generatedBlob),
        result: { interpretation: lp.interpretation, prompt: lp.prompt },
      })
      return
    }

    if (p.source === 'cloud' && p.originalUrl && p.generatedUrl) {
      setLoadingProject(p.id)
      try {
        const [origResp, genResp] = await Promise.all([
          fetch(p.originalUrl),
          fetch(p.generatedUrl),
        ])
        const [origBlob, genBlob] = await Promise.all([
          origResp.blob(),
          genResp.blob(),
        ])
        const originalFile = new File([origBlob], 'original.jpg', {
          type: origBlob.type || 'image/jpeg',
        })
        const generatedFile = new File([genBlob], 'generated.jpg', {
          type: genBlob.type || 'image/jpeg',
        })
        onLoad({
          originalFile,
          originalUrl: URL.createObjectURL(origBlob),
          generatedFile,
          generatedUrl: URL.createObjectURL(genBlob),
          result: { interpretation: p.interpretation, prompt: p.prompt },
        })
      } finally {
        setLoadingProject(null)
      }
    }
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
                  {p.source === 'local' && p.thumbOriginal && p.thumbGenerated ? (
                    <>
                      <img src={p.thumbOriginal} alt="" className="library-card__thumb" />
                      <span className="library-card__arrow">&rarr;</span>
                      <img src={p.thumbGenerated} alt="" className="library-card__thumb" />
                    </>
                  ) : p.source === 'cloud' && p.originalUrl && p.generatedUrl ? (
                    <>
                      <img src={p.originalUrl} alt="" className="library-card__thumb" loading="lazy" />
                      <span className="library-card__arrow">&rarr;</span>
                      <img src={p.generatedUrl} alt="" className="library-card__thumb" loading="lazy" />
                    </>
                  ) : null}
                </div>
                <p className="library-card__text">{p.interpretation}</p>
                <div className="library-card__meta">
                  <span className="library-card__date">{formatDate(p.createdAt)}</span>
                  {p.source === 'cloud' && (
                    <span className="library-card__badge">ענן</span>
                  )}
                </div>
                <div className="library-card__actions">
                  <button
                    className="gen-btn"
                    onClick={() => handleLoad(p)}
                    disabled={loadingProject === p.id}
                  >
                    {loadingProject === p.id ? 'טוען…' : 'טעינה'}
                  </button>
                  {p.source === 'local' && (
                    <button
                      className="link-btn"
                      onClick={() => handleDelete(p.id)}
                      disabled={deleting === p.id}
                    >
                      {deleting === p.id ? 'מוחק…' : 'מחיקה'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
