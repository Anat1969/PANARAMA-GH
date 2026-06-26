// Supabase Edge Function: generate-prompt
//
// Receives an uploaded image (base64) and asks Claude to interpret it and write
// a Midjourney prompt for a minimalist living space inspired by it. The Anthropic
// API key lives only here (Deno env secret ANTHROPIC_API_KEY) — never in the client.
//
// Deploy:  supabase functions deploy generate-prompt --no-verify-jwt
//          (or via the Supabase MCP deploy_edge_function tool)
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-opus-4-8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    interpretation: {
      type: 'string',
      description:
        'IN HEBREW: two to four sentences explaining how the uploaded image (its ' +
        'palette, mood, light and composition) is interpreted as a minimalist ' +
        'living space.',
    },
    prompt: {
      type: 'string',
      description:
        'A single Midjourney-ready prompt for that minimalist living space, ' +
        'ending with parameters like --ar 3:2 --style raw --v 6.',
    },
  },
  required: ['interpretation', 'prompt'],
}

const SYSTEM_PROMPT = `You translate an uploaded reference image into a calm, MINIMALIST LIVING SPACE.

Read the reference image carefully: its dominant colours, overall mood, lighting,
contrast and composition. Then imagine a serene, uncluttered interior living space
that carries the SAME palette and feeling — soft, airy, neumorphic, with diffused
natural light and a restrained material palette.

Return:
- "interpretation": IN HEBREW — 2-4 sentences, warm plain language, explaining what
  you read in the image and how it becomes this living space (name the colours/mood).
- "prompt": IN ENGLISH — ONE Midjourney prompt describing that living space —
  concrete nouns, materials, light, mood, lens — ending with: --ar 3:2 --style raw --v 6

Keep it tasteful and specific. Do not mention the reference image inside "prompt".
The interpretation MUST be Hebrew; the prompt MUST be English.`

function refineInstruction(previousPrompt: string, feedback?: string): string {
  return (
    `Here is a previous Midjourney prompt you wrote for this image:\n\n` +
    `"${previousPrompt}"\n\n` +
    (feedback && feedback.trim()
      ? `The user gave this feedback: "${feedback.trim()}". `
      : `The user wants a different take. `) +
    `Produce a clearly DIFFERENT, refined interpretation and prompt — vary the ` +
    `lighting, styling lens (e.g. Japandi / warm-minimal / monochrome / biophilic), ` +
    `materials or time of day — while staying faithful to the reference image's ` +
    `palette and calm mood.`
  )
}

const STRUCTURE_SYSTEM_PROMPT = `You distill an uploaded reference image into a MINIMALIST ARCHITECTURAL STRUCTURE.

You are NOT copying the image — you are extracting its design language: the rhythm,
proportions, tonal relationships, spatial tension, and material feeling. Then you
TRANSLATE and REINTERPRET those qualities into a pure, minimal architectural form.

Read the reference image carefully: its dominant colours, compositional geometry,
contrast ratios, directional energy, and textural mood. Then imagine an architectural
structure — it could be a pavilion, a room, a facade, an interior volume — that
embodies the SAME design DNA through geometry, material, and light.

Return:
- "interpretation": IN HEBREW — 2-4 sentences explaining what design language you
  extracted from the image and how it was reinterpreted as an architectural structure.
  Use words like "זיקקנו" (distilled), "תרגמנו" (translated), "פירשנו" (interpreted).
- "prompt": IN ENGLISH — ONE Midjourney prompt describing that minimalist structure —
  geometric volumes, materials, light, spatial qualities — ending with:
  --ar 3:2 --style raw --v 6

Be faithful to the original image's essence. You don't copy — you distill, translate,
and reinterpret. The interpretation MUST be Hebrew; the prompt MUST be English.`

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return json(
        { error: 'ANTHROPIC_API_KEY secret is not set on this Edge Function.' },
        500,
      )
    }

    const {
      imageBase64,
      mediaType = 'image/jpeg',
      mode = 'create',
      previousPrompt = '',
      feedback = '',
    } = await req.json()

    if (!imageBase64) {
      return json({ error: 'Missing imageBase64.' }, 400)
    }

    const isStructure = mode === 'structure'
    const userText =
      mode === 'refine' && previousPrompt
        ? refineInstruction(previousPrompt, feedback)
        : isStructure
          ? 'Extract the design language from this image and reinterpret it as a minimalist architectural structure.' +
            (feedback ? ` Additional direction: ${feedback}` : '')
          : 'Interpret this image as a minimalist living space and write the prompt.'

    const anthropicReq = {
      model: MODEL,
      max_tokens: 1024,
      system: isStructure ? STRUCTURE_SYSTEM_PROMPT : SYSTEM_PROMPT,
      output_config: {
        format: { type: 'json_schema', schema: OUTPUT_SCHEMA },
      },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: imageBase64 },
            },
            { type: 'text', text: userText },
          ],
        },
      ],
    }

    const resp = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(anthropicReq),
    })

    if (!resp.ok) {
      const detail = await resp.text()
      return json({ error: `Claude API error ${resp.status}`, detail }, 502)
    }

    const data = await resp.json()

    if (data.stop_reason === 'refusal') {
      return json({ error: 'The model declined this image. Try another.' }, 422)
    }

    // Structured output: the text block contains the JSON matching OUTPUT_SCHEMA.
    const textBlock = (data.content ?? []).find(
      (b: { type: string }) => b.type === 'text',
    )
    const raw = textBlock?.text ?? '{}'
    let parsed: { interpretation?: string; prompt?: string }
    try {
      parsed = JSON.parse(raw)
    } catch {
      return json({ error: 'Could not parse model output.', raw }, 502)
    }

    return json({
      interpretation: parsed.interpretation ?? '',
      prompt: parsed.prompt ?? '',
    })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
