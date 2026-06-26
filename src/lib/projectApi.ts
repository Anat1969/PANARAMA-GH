import { STORAGE_BUCKET, SUPABASE_CONFIGURED } from './config'
import { localPrompt } from './localPrompt'
import { dbSaveProject } from './projectDb'
import { supabase } from './supabase'

export type PromptResult = {
  interpretation: string
  prompt: string
}

export type GenerateMode = 'create' | 'refine'

/** Read a File into a bare base64 string (no data: prefix) + its media type. */
export function fileToBase64(
  file: File,
): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const result = String(reader.result)
      const comma = result.indexOf(',')
      resolve({
        base64: comma >= 0 ? result.slice(comma + 1) : result,
        mediaType: file.type || 'image/jpeg',
      })
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Interpret the image and produce a Midjourney prompt.
 * Uses Claude via the Edge Function when Supabase is configured; otherwise runs the
 * keyless in-browser generator so the app always works with no setup.
 */
export async function generatePrompt(
  file: File,
  opts: { mode?: GenerateMode; previousPrompt?: string; feedback?: string } = {},
): Promise<PromptResult> {
  if (!SUPABASE_CONFIGURED) {
    return localPrompt(file, opts)
  }
  const { base64, mediaType } = await fileToBase64(file)
  const { data, error } = await supabase.functions.invoke('generate-prompt', {
    body: {
      imageBase64: base64,
      mediaType,
      mode: opts.mode ?? 'create',
      previousPrompt: opts.previousPrompt ?? '',
      feedback: opts.feedback ?? '',
    },
  })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return { interpretation: data.interpretation ?? '', prompt: data.prompt ?? '' }
}

function ext(file: File): string {
  const fromType = file.type.split('/')[1]
  return (fromType || 'png').replace('jpeg', 'jpg')
}

export type SaveProjectArgs = {
  original: File
  generated: File
  interpretation: string
  prompt: string
  title?: string
}

export type SavedProject = {
  where: 'supabase' | 'folder' | 'downloads' | 'library'
  id?: string
  originalUrl?: string
  generatedUrl?: string
}

function interpretationDoc(args: SaveProjectArgs): string {
  return (
    `PANARAMA PROJECT\n================\n\n` +
    `Saved: ${new Date().toISOString()}\n\n` +
    `INTERPRETATION (image → minimalist living space)\n` +
    `------------------------------------------------\n${args.interpretation}\n\n` +
    `MIDJOURNEY PROMPT\n-----------------\n${args.prompt}\n`
  )
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

/** Save the project to a folder on the user's machine (no backend needed). */
export async function saveProjectLocal(args: SaveProjectArgs): Promise<SavedProject> {
  // Always persist to IndexedDB so the project survives in the in-app library.
  await dbSaveProject(args)

  const oExt = ext(args.original)
  const gExt = ext(args.generated)
  const doc = interpretationDoc(args)
  const json = JSON.stringify(
    { interpretation: args.interpretation, prompt: args.prompt, title: args.title ?? null },
    null,
    2,
  )

  // Preferred: File System Access API — write real files into a chosen folder.
  const picker = (window as unknown as { showDirectoryPicker?: () => Promise<any> })
    .showDirectoryPicker
  if (typeof picker === 'function') {
    try {
      const dir = await picker.call(window)
      const write = async (name: string, content: Blob | string) => {
        const fh = await dir.getFileHandle(name, { create: true })
        const ws = await fh.createWritable()
        await ws.write(content)
        await ws.close()
      }
      await write(`original.${oExt}`, args.original)
      await write(`midjourney.${gExt}`, args.generated)
      await write('interpretation.txt', doc)
      await write('project.json', json)
      return { where: 'folder' }
    } catch (err) {
      // User cancelled the folder picker — still saved to in-app library.
      if (err instanceof DOMException && err.name === 'AbortError') {
        return { where: 'library' }
      }
      // Otherwise fall through to downloads.
    }
  }

  // Fallback: individual downloads.
  triggerDownload(args.original, `panarama-original.${oExt}`)
  triggerDownload(args.generated, `panarama-midjourney.${gExt}`)
  triggerDownload(new Blob([doc], { type: 'text/plain' }), 'panarama-interpretation.txt')
  triggerDownload(new Blob([json], { type: 'application/json' }), 'panarama-project.json')
  return { where: 'downloads' }
}

/** Save the project — to Supabase when configured, otherwise to a local folder. */
export async function saveProject(args: SaveProjectArgs): Promise<SavedProject> {
  if (!SUPABASE_CONFIGURED) {
    return saveProjectLocal(args)
  }
  // Also persist to IndexedDB for the in-app library.
  await dbSaveProject(args).catch(() => {})
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`
  const originalPath = `${stamp}/original.${ext(args.original)}`
  const generatedPath = `${stamp}/generated.${ext(args.generated)}`

  const up1 = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(originalPath, args.original, { upsert: true, contentType: args.original.type })
  if (up1.error) throw new Error(`Upload original failed: ${up1.error.message}`)

  const up2 = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(generatedPath, args.generated, { upsert: true, contentType: args.generated.type })
  if (up2.error) throw new Error(`Upload generated failed: ${up2.error.message}`)

  const insert = await supabase
    .from('projects')
    .insert({
      title: args.title ?? null,
      interpretation: args.interpretation,
      prompt: args.prompt,
      original_path: originalPath,
      generated_path: generatedPath,
    })
    .select('id')
    .single()
  if (insert.error) throw new Error(`Save failed: ${insert.error.message}`)

  const originalUrl = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(originalPath)
    .data.publicUrl
  const generatedUrl = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(generatedPath)
    .data.publicUrl

  return { where: 'supabase', id: insert.data.id as string, originalUrl, generatedUrl }
}
