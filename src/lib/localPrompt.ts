// Keyless, in-browser prompt generation.
//
// Reads the uploaded image's real colours, brightness, saturation and temperature
// straight from a <canvas>, then composes an "interpretation" of it as a minimalist
// living space plus a Midjourney-ready prompt. No API key, no network — works on the
// static site out of the box. Used as the default; the Claude/Supabase path upgrades
// it when configured.

import type { GenerateMode, PromptResult } from './projectApi'

type Analysis = {
  avg: [number, number, number]
  palette: { name: string; hex: string }[]
  brightness: number // 0..1
  saturation: number // 0..1
  temperature: 'warm' | 'cool' | 'neutral'
}

const NAMED: { name: string; rgb: [number, number, number] }[] = [
  { name: 'soft white', rgb: [240, 242, 245] },
  { name: 'pale grey', rgb: [200, 205, 212] },
  { name: 'slate blue-grey', rgb: [110, 127, 141] },
  { name: 'warm sand', rgb: [214, 196, 168] },
  { name: 'oatmeal beige', rgb: [206, 192, 170] },
  { name: 'muted sage', rgb: [168, 182, 160] },
  { name: 'dusty taupe', rgb: [168, 152, 140] },
  { name: 'charcoal', rgb: [70, 74, 80] },
  { name: 'soft terracotta', rgb: [196, 132, 104] },
  { name: 'pale sky', rgb: [196, 214, 226] },
  { name: 'deep forest', rgb: [70, 92, 78] },
  { name: 'ink navy', rgb: [54, 66, 92] },
]

function nearestName(rgb: [number, number, number]): string {
  let best = NAMED[0]
  let bestD = Infinity
  for (const c of NAMED) {
    const d =
      (c.rgb[0] - rgb[0]) ** 2 + (c.rgb[1] - rgb[1]) ** 2 + (c.rgb[2] - rgb[2]) ** 2
    if (d < bestD) {
      bestD = d
      best = c
    }
  }
  return best.name
}

const toHex = (rgb: [number, number, number]) =>
  '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

function analyze(data: Uint8ClampedArray): Analysis {
  let r = 0,
    g = 0,
    b = 0,
    n = 0
  const buckets = new Map<string, { sum: [number, number, number]; count: number }>()

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 16) continue // skip transparent
    const pr = data[i],
      pg = data[i + 1],
      pb = data[i + 2]
    r += pr
    g += pg
    b += pb
    n++
    const key = `${pr >> 5}-${pg >> 5}-${pb >> 5}` // 8 levels per channel
    const cur = buckets.get(key) ?? { sum: [0, 0, 0], count: 0 }
    cur.sum[0] += pr
    cur.sum[1] += pg
    cur.sum[2] += pb
    cur.count++
    buckets.set(key, cur)
  }
  n = Math.max(1, n)
  const avg: [number, number, number] = [r / n, g / n, b / n]

  const top = [...buckets.values()].sort((a, c) => c.count - a.count).slice(0, 3)
  const palette = top.map((t) => {
    const rgb: [number, number, number] = [
      t.sum[0] / t.count,
      t.sum[1] / t.count,
      t.sum[2] / t.count,
    ]
    return { name: nearestName(rgb), hex: toHex(rgb) }
  })

  const max = Math.max(...avg)
  const min = Math.min(...avg)
  const brightness = (0.299 * avg[0] + 0.587 * avg[1] + 0.114 * avg[2]) / 255
  const saturation = max === 0 ? 0 : (max - min) / max
  const temperature: Analysis['temperature'] =
    avg[0] - avg[2] > 14 ? 'warm' : avg[2] - avg[0] > 14 ? 'cool' : 'neutral'

  return { avg, palette, brightness, saturation, temperature }
}

function loadAnalysis(file: File): Promise<Analysis> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read the image.'))
    }
    img.onload = () => {
      const size = 48
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error('Canvas unavailable.'))
        return
      }
      ctx.drawImage(img, 0, 0, size, size)
      const data = ctx.getImageData(0, 0, size, size).data
      URL.revokeObjectURL(url)
      resolve(analyze(data))
    }
    img.src = url
  })
}

const LENSES = [
  { key: 'scandinavian', desc: 'Scandinavian calm, pale oak and linen' },
  { key: 'japandi', desc: 'Japandi restraint, low wood furniture and paper light' },
  { key: 'warm-minimal', desc: 'warm minimalism, plaster walls and soft boucle' },
  { key: 'monochrome', desc: 'tonal monochrome, single-hue layering' },
  { key: 'biophilic', desc: 'biophilic stillness, a few sculptural plants' },
]

const LIGHTS = [
  'soft diffused morning light',
  'overcast even daylight',
  'low golden afternoon light',
  'gentle north-facing window light',
]

function moodWords(a: Analysis): string {
  const bright =
    a.brightness > 0.66 ? 'bright and airy' : a.brightness > 0.4 ? 'soft and calm' : 'dim and hushed'
  const sat = a.saturation < 0.18 ? 'muted' : a.saturation < 0.4 ? 'gently coloured' : 'rich'
  return `${bright}, ${sat}, ${a.temperature}-toned`
}

/** Keyless interpretation + Midjourney prompt, derived from the image itself. */
export async function localPrompt(
  file: File,
  opts: { mode?: GenerateMode; previousPrompt?: string; feedback?: string } = {},
): Promise<PromptResult> {
  const a = await loadAnalysis(file)
  const names = a.palette.map((p) => p.name)
  const paletteText = names.slice(0, 3).join(', ')
  const mood = moodWords(a)

  // Vary the lens/light each refine (and fold in any feedback).
  const variant =
    opts.mode === 'refine'
      ? ((opts.previousPrompt?.length ?? 0) + (opts.feedback?.length ?? 0) + 1)
      : 0
  const lens = LENSES[variant % LENSES.length]
  const light = LIGHTS[variant % LIGHTS.length]
  const feedback = (opts.feedback ?? '').trim()

  const interpretation =
    `Your image reads as ${mood}, built mainly from ${paletteText}. ` +
    `Translated into a minimalist living space, that becomes a serene room in the ` +
    `same palette — ${a.temperature === 'warm' ? 'warm, grounded' : a.temperature === 'cool' ? 'cool, quiet' : 'balanced, neutral'} ` +
    `surfaces under ${light}, uncluttered and restful` +
    (opts.mode === 'refine' ? `, reworked toward ${lens.desc}.` : '.')

  const prompt =
    `minimalist living space interior, ${lens.desc}, ` +
    `palette of ${paletteText}, ${mood} atmosphere, ${light}, ` +
    `uncluttered, soft neumorphic shadows, natural materials, calm and serene` +
    (feedback ? `, ${feedback}` : '') +
    `, architectural interior photography --ar 3:2 --style raw --v 6`

  return { interpretation, prompt }
}
