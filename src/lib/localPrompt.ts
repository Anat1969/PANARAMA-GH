// Keyless, in-browser architectural prompt generation.
//
// Reads the uploaded landscape/reference image's colours, brightness, saturation
// and temperature from a <canvas>, then composes an architectural interpretation
// of the landscape's DNA as an interior living space — plus a Midjourney-ready
// prompt. Designed as a real-time tool for architects meeting clients: upload
// the client's dream landscape and translate it into architectural reality.

import type { GenerateMode, PromptResult } from './projectApi'

type ColorName = { en: string; he: string }

type Analysis = {
  avg: [number, number, number]
  palette: { name: ColorName; hex: string }[]
  brightness: number
  saturation: number
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
  { en: 'golden ochre', he: 'אוכרה זהובה', rgb: [196, 168, 100] },
  { en: 'moss green', he: 'ירוק טחב', rgb: [120, 148, 108] },
  { en: 'clay brown', he: 'חום חרסית', rgb: [164, 120, 88] },
  { en: 'coral blush', he: 'אלמוג ורדרד', rgb: [216, 160, 148] },
  { en: 'storm grey', he: 'אפור סוער', rgb: [128, 136, 148] },
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
    if (data[i + 3] < 16) continue
    const pr = data[i],
      pg = data[i + 1],
      pb = data[i + 2]
    r += pr
    g += pg
    b += pb
    n++
    const key = `${pr >> 5}-${pg >> 5}-${pb >> 5}`
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

// Architectural styles — the DNA of the landscape translated into interior language
const STYLES = [
  { en: 'organic modernism, curved walls echoing natural landforms', he: 'מודרניזם אורגני, קירות מעוגלים המהדהדים תבניות נוף' },
  { en: 'Scandinavian restraint, clean lines and pale timber', he: 'איפוק סקנדינבי, קווים נקיים ועץ בהיר' },
  { en: 'Japandi fusion, wabi-sabi textures with Nordic clarity', he: 'יפנדי, מרקמי ואבי-סאבי עם בהירות נורדית' },
  { en: 'desert modernism, earth-toned volumes and deep shade', he: 'מודרניזם מדברי, נפחים בגווני אדמה וצל עמוק' },
  { en: 'Mediterranean vernacular, arched openings and lime plaster', he: 'ורנקולרי ים-תיכוני, קשתות וטיח סיד' },
  { en: 'brutalist warmth, raw concrete softened by natural light', he: 'ברוטליזם חמים, בטון חשוף מרוכך באור טבעי' },
  { en: 'biophilic architecture, indoor gardens and living walls', he: 'אדריכלות ביופילית, גנים פנימיים וקירות חיים' },
  { en: 'tropical modernism, open breezeways and woven screens', he: 'מודרניזם טרופי, מעברי רוח פתוחים ומסכי קלועים' },
  { en: 'neo-vernacular, local stone and contemporary glass', he: 'ניאו-ורנקולרי, אבן מקומית וזכוכית עכשווית' },
  { en: 'pavilion style, floating roof planes and panoramic glazing', he: 'סגנון ביתן, מישורי גג צפים וזיגוג פנורמי' },
]

const LIGHTS = [
  { en: 'soft diffused morning light flooding through floor-to-ceiling glass', he: 'אור בוקר רך שוטף דרך זכוכית מרצפה לתקרה' },
  { en: 'dramatic side light casting deep architectural shadows', he: 'אור צד דרמטי היוצר צללים אדריכליים עמוקים' },
  { en: 'golden hour warmth filtering through clerestory windows', he: 'חום שעת הזהב מסתנן דרך חלונות עליונים' },
  { en: 'cool north light creating even diffused illumination', he: 'אור צפוני קריר היוצר תאורה מפוזרת אחידה' },
  { en: 'dappled light through perforated screens and lattice', he: 'אור מנוקד דרך מסכים מחוררים וסורגים' },
  { en: 'skylight overhead washing walls with zenithal light', he: 'אשנב עילי שוטף קירות באור זניתלי' },
  { en: 'warm evening glow with concealed indirect lighting', he: 'זוהר ערב חם עם תאורה עקיפה מוסתרת' },
]

const MATERIALS = [
  { en: 'board-formed concrete and oiled oak', he: 'בטון בתבנית לוחות ואלון משומן' },
  { en: 'rammed earth walls and blackened steel', he: 'קירות אדמה דחוסה ופלדה מושחרת' },
  { en: 'local limestone and aged brass fixtures', he: 'אבן גיר מקומית ואביזרי פליז מיושן' },
  { en: 'terrazzo floors and hand-troweled plaster', he: 'רצפת טראצו וטיח ביד' },
  { en: 'reclaimed timber beams and raw linen', he: 'קורות עץ ממוחזר ופשתן גולמי' },
  { en: 'polished concrete and warm walnut joinery', he: 'בטון מוחלק ונגרות אגוז חמה' },
  { en: 'clay-rendered walls and woven natural fibers', he: 'קירות מחופים חרסית וסיבים טבעיים ארוגים' },
  { en: 'corten steel accents and white-washed brick', he: 'דגשי פלדת קורטן ולבנים מסוידים' },
  { en: 'travertine surfaces and brushed stainless', he: 'משטחי טרוורטין ונירוסטה מוברשת' },
]

const SPACES = [
  { en: 'double-height living space with mezzanine gallery', he: 'חלל מגורים בגובה כפול עם גלריית ביניים' },
  { en: 'open-plan living area flowing into a sheltered courtyard', he: 'חלל מגורים פתוח הזורם לחצר מוגנת' },
  { en: 'sunken conversation pit with panoramic landscape views', he: 'בור שיחה שקוע עם נוף פנורמי' },
  { en: 'cantilevered bedroom hovering above the terrain', he: 'חדר שינה קונזולי מרחף מעל השטח' },
  { en: 'vaulted kitchen-dining hall with exposed structure', he: 'אולם מטבח-אוכל מקומר עם מבנה חשוף' },
  { en: 'glass-walled study framing the landscape like a painting', he: 'חדר עבודה מקיר זכוכית הממסגר את הנוף כציור' },
  { en: 'master suite with private terrace and outdoor bath', he: 'סוויטת אב עם מרפסת פרטית ואמבטיה חיצונית' },
  { en: 'minimalist entrance hall with a single sculptural element', he: 'מבואה מינימליסטית עם אלמנט פיסולי בודד' },
  { en: 'library loft bathed in skylight', he: 'עליית ספרייה רחוצה באור שמיים' },
  { en: 'spa-like bathroom with stone basin and frameless glass', he: 'חדר רחצה כמו ספא עם כיור אבן וזכוכית ללא מסגרת' },
]

const CAMERAS = [
  { en: 'wide-angle architectural photography, 24mm lens', he: 'צילום אדריכלי בעדשה רחבה 24מ״מ' },
  { en: '35mm eye-level perspective, natural proportions', he: 'פרספקטיבה בגובה עיניים 35מ״מ, פרופורציות טבעיות' },
  { en: 'medium format camera, rich tonal depth', he: 'מצלמת פורמט בינוני, עומק טונאלי עשיר' },
  { en: 'tilt-shift lens correcting verticals, editorial style', he: 'עדשת טילט-שיפט, סגנון עריכתי' },
  { en: 'drone perspective looking into the interior from above', he: 'פרספקטיבת רחפן מביטה פנימה מלמעלה' },
]

const LANDSCAPE_DNA = [
  { en: 'inspired by the horizon lines and open sky of the landscape', he: 'בהשראת קווי האופק והשמיים הפתוחים של הנוף' },
  { en: 'drawing from the organic textures and layered geology of the terrain', he: 'שואב ממרקמים אורגניים ומהגיאולוגיה השכבתית של השטח' },
  { en: 'translating the rhythm of light and shadow in the natural scene', he: 'מתרגם את קצב האור והצל בסצנה הטבעית' },
  { en: 'echoing the depth and atmosphere of the original landscape', he: 'מהדהד את העומק והאטמוספרה של הנוף המקורי' },
  { en: 'capturing the emotional essence and spatial drama of the view', he: 'לוכד את המהות הרגשית והדרמה המרחבית של הנוף' },
  { en: 'abstracting the natural forms into architectural volumes', he: 'מפשט את הצורות הטבעיות לנפחים אדריכליים' },
]

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function moodWords(a: Analysis): { en: string; he: string } {
  const bright =
    a.brightness > 0.66
      ? { en: 'luminous and expansive', he: 'זוהר ומרחבי' }
      : a.brightness > 0.4
        ? { en: 'balanced and serene', he: 'מאוזן ושליו' }
        : { en: 'intimate and grounded', he: 'אינטימי ומעוגן' }
  const sat =
    a.saturation < 0.18
      ? { en: 'restrained tones', he: 'גוונים מאופקים' }
      : a.saturation < 0.4
        ? { en: 'subtle natural hues', he: 'גוונים טבעיים עדינים' }
        : { en: 'vivid earthy palette', he: 'פלטה אדמתית עזה' }
  const tempHe = a.temperature === 'warm' ? 'גוון חמים' : a.temperature === 'cool' ? 'גוון קריר' : 'גוון ניטרלי'
  return {
    en: `${bright.en}, ${sat.en}, ${a.temperature}-toned`,
    he: `${bright.he}, ${sat.he}, ${tempHe}`,
  }
}

export async function localPrompt(
  file: File,
  opts: { mode?: GenerateMode; previousPrompt?: string; feedback?: string } = {},
): Promise<PromptResult> {
  const a = await loadAnalysis(file)
  const palette = a.palette.slice(0, 3)
  const paletteEn = palette.map((p) => p.name.en).join(', ')
  const paletteHe = palette.map((p) => p.name.he).join(', ')
  const mood = moodWords(a)

  const style = pick(STYLES)
  const light = pick(LIGHTS)
  const material = pick(MATERIALS)
  const space = pick(SPACES)
  const camera = pick(CAMERAS)
  const dna = pick(LANDSCAPE_DNA)
  const feedback = (opts.feedback ?? '').trim()
  const tempHe = a.temperature === 'warm' ? 'חם ומעוגן' : a.temperature === 'cool' ? 'קריר ושקט' : 'מאוזן וניטרלי'

  const interpretation =
    `הנוף שהעלית נקרא ${mood.he}, בפלטה של ${paletteHe}. ` +
    `ה-DNA של הנוף הזה — הצבעים, האור, העומק — מתורגם ל${space.he}, ` +
    `${dna.he}. חלל פנים ב${tempHe} עם ${material.he}, ` +
    `תחת ${light.he}, בגישת ${style.he}.`

  const prompt =
    `architectural interior living space, ${space.en}, ${style.en}, ` +
    `${dna.en}, palette derived from the landscape: ${paletteEn}, ` +
    `${material.en}, ${mood.en} atmosphere, ${light.en}, ` +
    `sophisticated spatial composition, human-scale proportions` +
    (feedback ? `, ${feedback}` : '') +
    `, ${camera.en} --ar 3:2 --style raw --v 6`

  return { interpretation, prompt }
}
