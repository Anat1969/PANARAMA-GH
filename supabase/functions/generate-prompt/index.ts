// Supabase Edge Function: generate-prompt
//
// Receives an uploaded image (base64) and asks Claude to interpret it and write
// a Midjourney prompt for an architectural interior living space inspired by the
// landscape's DNA. The Anthropic API key lives only here (Deno env secret
// ANTHROPIC_API_KEY) — never in the client.
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
        'IN HEBREW: two to four sentences explaining how the uploaded landscape ' +
        'image — its palette, mood, light and composition — inspires an ' +
        'architectural interior living space. Reference the landscape DNA.',
    },
    prompt: {
      type: 'string',
      description:
        'A single Midjourney-ready prompt for an architectural interior living ' +
        'space inspired by the landscape DNA of the uploaded image, ending with ' +
        'parameters like --ar 3:2 --style raw --v 6.',
    },
  },
  required: ['interpretation', 'prompt'],
}

const SYSTEM_PROMPT = `You are an architect's creative partner. You translate an uploaded LANDSCAPE or reference image into an ARCHITECTURAL INTERIOR LIVING SPACE inspired by that landscape's DNA.

Read the reference image carefully — its dominant colours, light rhythm, horizon lines, organic textures, depth, atmosphere, emotional essence and natural forms. Then design a unique architectural interior that draws its soul from this landscape: the palette, materials, spatial feeling and light all echo the DNA of the original scene.

Each response must be genuinely DIFFERENT from any previous one. Vary the architectural style (e.g. organic modernism, Japandi, desert modernism, Mediterranean revival, brutalist warmth, biophilic, tropical modernism, neo-vernacular, pavilion style, Scandinavian), the space type (double-height living room, courtyard, conversation pit, cantilevered bedroom, vaulted kitchen, glass-walled study, master suite, entrance hall, library loft, spa bathroom), the lighting approach, materials and camera angle.

Return:
- "interpretation": IN HEBREW — 2-4 sentences, warm plain language. Explain what you read in the landscape's DNA (name the colours, light, mood, forms) and how it translates into this specific architectural interior.
- "prompt": IN ENGLISH — ONE Midjourney prompt for that architectural interior living space — concrete nouns, specific materials, architectural details, light quality, mood, lens — ending with: --ar 3:2 --style raw --v 6

Keep it tasteful, specific and architecturally grounded. Do not mention "reference image" or "landscape" inside "prompt" — describe the interior as if it exists.
The interpretation MUST be Hebrew; the prompt MUST be English.`

function refineInstruction(previousPrompt: string, feedback?: string): string {
  return (
    `Here is a previous Midjourney prompt you wrote for this image:\n\n` +
    `"${previousPrompt}"\n\n` +
    (feedback && feedback.trim()
      ? `The user gave this feedback: "${feedback.trim()}". `
      : `The user wants a different take. `) +
    `Produce a clearly DIFFERENT, refined interpretation and prompt — vary the ` +
    `architectural style, space type, lighting approach, materials or camera angle ` +
    `— while staying faithful to the landscape's DNA: its palette, forms and ` +
    `emotional essence.`
  )
}

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

    const userText =
      mode === 'refine' && previousPrompt
        ? refineInstruction(previousPrompt, feedback)
        : 'Read this landscape\'s DNA and design an architectural interior living space inspired by it. Write the prompt.'

    const anthropicReq = {
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
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
