# Panarama — Image → Prompt → Transition

A neumorphic app that turns a reference image into a **minimalist living space**:
upload an image, let **Claude** interpret it and write a **Midjourney prompt**,
generate the image in Midjourney, paste it back, and **connect the two images**
with three transition states — **Fade · Slide · Zoom**. Save the finished pair to
**Supabase**.

The visual language is taken from the "Elements" neumorphic style board (soft
blue-grey palette, diffused inner/outer shadows, thin wide-tracked labels).

> **Works out of the box (local mode).** With no configuration, prompts are
> generated **in your browser** from the uploaded image's real colours and mood,
> and **Save Project** writes the two images + `interpretation.txt` to a folder you
> pick. Configure Supabase + a Claude key (below) to upgrade to **Claude-written**
> prompts and cloud save — the app picks the Claude path automatically when present.

## The workflow

1. **Upload** a reference image (click · drag · or paste with ⌘/Ctrl+V).
2. **Create Prompt** — Claude (`claude-opus-4-8`, vision) reads the image's palette,
   mood, light and composition and returns:
   - an **interpretation** (2–4 sentences explaining the reading), and
   - a **Midjourney-ready prompt** for a minimalist living space in that mood.
3. **Refine Prompt** — not happy with it? Add a note ("warmer", "evening light",
   "more wood") and regenerate a different take.
4. **Copy** the prompt → generate in Midjourney → **paste** the result back.
5. **Transition** — pick Fade / Slide / Zoom to connect your image and the
   generated space; click the image to play it.
6. **Save Project** — stores both images + the interpretation + prompt in Supabase.

## Architecture

The site is static (GitHub Pages), so the Claude API key never lives in the browser:

```
Browser (React, GitHub Pages)
   │  image (base64)
   ▼
Supabase Edge Function  generate-prompt   ──►  Claude API (claude-opus-4-8, vision)
   │  { interpretation, prompt }
   ▼
Browser  ──►  Supabase Storage (images) + table `projects` (text)
```

- **`supabase/functions/generate-prompt/index.ts`** — Deno Edge Function; holds
  `ANTHROPIC_API_KEY` as a secret, calls Claude with structured output
  (`output_config.format`), returns `{ interpretation, prompt }`.
- **`supabase/migrations/0001_projects.sql`** — `projects` table + the
  `panarama-projects` Storage bucket + anon RLS policies (demo-grade).
- **`src/lib/`** — `supabase.ts` (client), `config.ts` (URL + publishable key),
  `projectApi.ts` (`generatePrompt`, `saveProject`).

## Setup

You can skip this entirely — the app runs in local mode by default. Do it only to
enable Claude-written prompts and cloud save.

### 1. Front-end key
In `src/lib/config.ts`, set `SUPABASE_ANON_KEY` to your project's **publishable /
anon** key (safe to commit — it's the public client key). The project URL defaults
to `https://slcpldoaaagkoozpbjsk.supabase.co`. You can also pass
`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` at build time.

### 2. Provision Supabase (once)
```bash
# DB + storage
supabase db push        # or run supabase/migrations/0001_projects.sql in the SQL editor

# Edge Function + secret
supabase functions deploy generate-prompt --no-verify-jwt
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...    # your Claude key — never in the client
```

### 3. Run
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

## Project structure

```
src/
  components/
    ImageDrop.tsx        # upload / drag / paste image input
    PromptPanel.tsx      # interpretation + prompt, Copy / Create / Refine
    SaveProjectButton.tsx# save the pair to Supabase
    ImageStage.tsx       # two stacked layers; plays the active transition
    TransitionPicker.tsx # Fade / Slide / Zoom
  lib/
    config.ts  supabase.ts  projectApi.ts
  hooks/useGallery.ts    # index / transition / direction state
  styles/theme.css  transitions.css
  App.tsx                # the 4-step flow
supabase/
  functions/generate-prompt/index.ts
  migrations/0001_projects.sql
```

## Notes

- **Fonts** — the board's Campton / Avenir Next are licensed; substituted with
  **Jost** / **Nunito Sans** from Google Fonts. Swap in `index.html` + `theme.css`.
- The demo RLS policies allow anon insert/read — tighten before real multi-user use.
