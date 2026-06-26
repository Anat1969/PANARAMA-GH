// Keyless, in-browser prompt generation.
//
// Reads the uploaded image's real colours, brightness, saturation and temperature
// straight from a <canvas>, then composes an "interpretation" of it as a minimalist
// living space plus a Midjourney-ready prompt. No API key, no network — works on the
// static site out of the box. Used as the default; the Claude/Supabase path upgrades
// it when configured.

import type { GenerateMode, PromptResult } from './projectApi'

type ColorName = { en: string; he: string }

type Analysis = {
  avg: [number, number, number]
  palette: { name: ColorName; hex: string }[]
  brightness: number // 0..1
  saturation: number // 0..1
  temperature: 'warm' | 'cool' | 'neutral'
}

const NAMED: { en: string; he: string; rgb: [number, number, number] }[] = [
  { en: 'soft white', he: 'לבן רך', rgb: [240, 242, 245] },
  { en: 'pale grey', he: 'אפור בהיר', rgb: [200, 205, 212] },
  { en: 'slate blue-grey', he: 'תכלת-אפור', rgb: [110, 127, 141] },
  { en: 'warm sand', he: 'חול חמים', rgb: [214, 196, 168] },
  { en: 'oatmeal beige', he: 'בז׳ שיבולת', rgb: [206, 192, 170] },
  { en: 'muted sage', he: 'מרווה עמום', rgb: [168, 182, 160] },
  { en: 'dusty taupe', he: 'טאופ עפרורי', rgb: [168, 152, 140] },
  { en: 'charcoal', he: 'פחם', rgb: [70, 74, 80] },
  { en: 'soft terracotta', he: 'טרקוטה רכה', rgb: [196, 132, 104] },
  { en: 'pale sky', he: 'תכלת שמיים', rgb: [196, 214, 226] },
  { en: 'deep forest', he: 'ירוק יער', rgb: [70, 92, 78] },
  { en: 'ink navy', he: 'כחול דיו', rgb: [54, 66, 92] },
]

function nearestName(rgb: [number, number, number]): ColorName {
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
  return { en: best.en, he: best.he }
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
  { en: 'Scandinavian calm, pale oak and linen', he: 'רוגע סקנדינבי, אלון בהיר ופשתן' },
  { en: 'Japandi restraint, low wood furniture and paper light', he: 'איפוק יפנדי, רהיטי עץ נמוכים ואור רך' },
  { en: 'warm minimalism, plaster walls and soft boucle', he: 'מינימליזם חמים, קירות טיח ובוקלה רכה' },
  { en: 'tonal monochrome, single-hue layering', he: 'מונוכרום טונאלי, שכבות בגוון אחד' },
  { en: 'biophilic stillness, a few sculptural plants', he: 'שלווה ביופילית, כמה צמחים פסליים' },
  { en: 'Mediterranean serenity, lime-washed walls and terracotta', he: 'שלווה ים-תיכונית, קירות סיד וטרקוטה' },
  { en: 'wabi-sabi simplicity, imperfect ceramics and raw wood', he: 'פשטות ואבי-סאבי, קרמיקה לא מושלמת ועץ גולמי' },
  { en: 'coastal minimal, driftwood and bleached tones', he: 'מינימליזם חופי, עץ סחף וגוונים שטופי שמש' },
]

const LIGHTS = [
  { en: 'soft diffused morning light', he: 'אור בוקר רך ומפוזר' },
  { en: 'overcast even daylight', he: 'אור יום אחיד ומעונן' },
  { en: 'low golden afternoon light', he: 'אור אחר־צהריים זהוב ונמוך' },
  { en: 'gentle north-facing window light', he: 'אור עדין מחלון צפוני' },
  { en: 'warm sunset glow through sheer curtains', he: 'זוהר שקיעה חמים דרך וילונות שקופים' },
  { en: 'cool blue twilight ambiance', he: 'אווירת דמדומים כחולה וקרירה' },
]

const MATERIALS = [
  { en: 'raw linen and light oak', he: 'פשתן גולמי ואלון בהיר' },
  { en: 'polished concrete and walnut', he: 'בטון מוחלק ואגוז' },
  { en: 'matte ceramic and pale birch', he: 'קרמיקה מאט וליבנה בהירה' },
  { en: 'travertine and brushed brass', he: 'טרוורטין ופליז מוברש' },
  { en: 'washed cotton and rattan', he: 'כותנה שטופה וראטן' },
  { en: 'lime plaster and natural stone', he: 'טיח סיד ואבן טבעית' },
]

const CAMERAS = [
  { en: 'wide-angle architectural lens', he: 'עדשה רחבה אדריכלית' },
  { en: '35mm eye-level perspective', he: 'פרספקטיבה בגובה העיניים 35מ״מ' },
  { en: 'telephoto compressed perspective', he: 'פרספקטיבה דחוסה טלפוטו' },
  { en: 'medium format, shallow depth of field', he: 'פורמט בינוני, עומק שדה רדוד' },
]

const ROOMS = [
  { en: 'open living room', he: 'סלון פתוח' },
  { en: 'serene bedroom', he: 'חדר שינה שליו' },
  { en: 'sunlit reading nook', he: 'פינת קריאה מוצפת שמש' },
  { en: 'minimalist studio', he: 'סטודיו מינימליסטי' },
  { en: 'airy kitchen-dining space', he: 'מטבח-פינת אוכל אווריריים' },
]

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function moodWords(a: Analysis): { en: string; he: string } {
  const bright =
    a.brightness > 0.66
      ? { en: 'bright and airy', he: 'בהיר ואוורירי' }
      : a.brightness > 0.4
        ? { en: 'soft and calm', he: 'רך ורגוע' }
        : { en: 'dim and hushed', he: 'מעומעם ושקט' }
  const sat =
    a.saturation < 0.18
      ? { en: 'muted', he: 'עמום' }
      : a.saturation < 0.4
        ? { en: 'gently coloured', he: 'מעט צבעוני' }
        : { en: 'rich', he: 'עשיר' }
  const tempHe = a.temperature === 'warm' ? 'גוון חמים' : a.temperature === 'cool' ? 'גוון קריר' : 'גוון ניטרלי'
  return {
    en: `${bright.en}, ${sat.en}, ${a.temperature}-toned`,
    he: `${bright.he}, ${sat.he}, ${tempHe}`,
  }
}

/** Keyless interpretation (Hebrew) + Midjourney prompt (English), from the image. */
export async function localPrompt(
  file: File,
  opts: { mode?: GenerateMode; previousPrompt?: string; feedback?: string } = {},
): Promise<PromptResult> {
  const a = await loadAnalysis(file)
  const palette = a.palette.slice(0, 3)
  const paletteEn = palette.map((p) => p.name.en).join(', ')
  const paletteHe = palette.map((p) => p.name.he).join(', ')
  const mood = moodWords(a)

  const lens = pick(LENSES)
  const light = pick(LIGHTS)
  const material = pick(MATERIALS)
  const camera = pick(CAMERAS)
  const room = pick(ROOMS)
  const feedback = (opts.feedback ?? '').trim()
  const tempHe = a.temperature === 'warm' ? 'חם ומעוגן' : a.temperature === 'cool' ? 'קריר ושקט' : 'מאוזן וניטרלי'

  const interpretation =
    `התמונה שלך נקראת ${mood.he}, ובנויה בעיקר מ${paletteHe}. ` +
    `בתרגום למרחב מחיה מינימליסטי, זה הופך ל${room.he} שליו באותה פלטה — ` +
    `${material.he} ב${tempHe} תחת ${light.he}, בגישת ${lens.he}.`

  const prompt =
    `${room.en}, ${lens.en}, ` +
    `palette of ${paletteEn}, ${material.en}, ` +
    `${mood.en} atmosphere, ${light.en}, ` +
    `uncluttered, soft neumorphic shadows, calm and serene` +
    (feedback ? `, ${feedback}` : '') +
    `, ${camera.en}, interior photography --ar 3:2 --style raw --v 6`

  return { interpretation, prompt }
}
