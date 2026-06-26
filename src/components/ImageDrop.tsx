import { useEffect, useRef, useState } from 'react'

type Props = {
  label: string
  hint: string
  /** Object URL of the current image, if any. */
  previewUrl: string | null
  onImage: (file: File) => void
}

/**
 * Image input that accepts a file picker, drag-and-drop, and clipboard paste
 * (Ctrl/Cmd+V). While focused/hovered it shows a soft neumorphic drop frame.
 */
export function ImageDrop({ label, hint, previewUrl, onImage }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const take = (file?: File | null) => {
    if (file && file.type.startsWith('image/')) onImage(file)
  }

  // Clipboard paste — active while this drop zone is in the document.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) =>
        i.type.startsWith('image/'),
      )
      if (item) take(item.getAsFile())
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={rootRef}
      className={`drop ${dragOver ? 'is-over' : ''} ${previewUrl ? 'has-image' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          inputRef.current?.click()
        }
      }}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        take(e.dataTransfer.files?.[0])
      }}
      style={previewUrl ? { backgroundImage: `url(${previewUrl})` } : undefined}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => take(e.target.files?.[0])}
      />
      {!previewUrl && (
        <div className="drop__inner">
          <span className="drop__label">{label}</span>
          <span className="drop__hint">{hint}</span>
        </div>
      )}
      {previewUrl && <span className="drop__change">החלפה</span>}
    </div>
  )
}
