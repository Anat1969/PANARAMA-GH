import { STORAGE_BUCKET } from './config'
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

/** Call the Edge Function to interpret the image and produce a Midjourney prompt. */
export async function generatePrompt(
  file: File,
  opts: { mode?: GenerateMode; previousPrompt?: string; feedback?: string } = {},
): Promise<PromptResult> {
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
  id: string
  originalUrl: string
  generatedUrl: string
}

/** Upload both images to Storage and insert a projects row. Returns the new id + URLs. */
export async function saveProject(args: SaveProjectArgs): Promise<SavedProject> {
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

  return { id: insert.data.id as string, originalUrl, generatedUrl }
}
